import * as Sentry from '@sentry/node';
import { env as configEnv } from './config/env';

Sentry.init({
  dsn: configEnv.SENTRY_DSN,
  environment: configEnv.NODE_ENV,
  tracesSampleRate: configEnv.NODE_ENV === 'production' ? 0.1 : 1.0,
});

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { getStripe } from './lib/stripe';
import { prisma } from './lib/db';
import { EscrowStateMachine } from './lib/escrow';
import { authenticate } from './middleware/auth';
import { startEscrowCron } from './jobs/escrowCron';
import { notifyUser } from './lib/notifications';
import { logSecurityAuditEvent } from './lib/securityAudit';
import { verifyWebhookSignature } from './middleware/webhookVerify';
import { adaptBankTransferWebhook } from './lib/bankTransferAdapter';
import { apiLimiter, webhookLimiter } from './middleware/rateLimiter';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? '1' : '0'));
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : false);
const port = process.env.PORT || 3000;

// âœ… AGREGAR AQUÃ â€” antes de cualquier otro middleware
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP por ahora si sirves el frontend desde aquÃ­
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(pinoHttp({ logger }));



// â”€â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { env } from './config/env';

const allowedOrigins = [
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
];
if (env.APP_URL) {
  allowedOrigins.push(env.APP_URL.trim());
}
const localDevOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
const isProductionEnv = env.NODE_ENV === 'production';
const effectiveAllowedOrigins = isProductionEnv
  ? allowedOrigins
  : Array.from(new Set([...localDevOrigins, ...allowedOrigins]));
const allowedOriginSet = new Set(effectiveAllowedOrigins);

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '');
}

function originMatchesRequestHost(origin: string, requestHost: string): boolean {
  if (!origin || !requestHost) return false;
  try {
    const originHost = normalizeHost(new URL(origin).host);
    const targetHost = normalizeHost(requestHost);
    return (
      originHost === targetHost ||
      originHost === `www.${targetHost}` ||
      targetHost === `www.${originHost}`
    );
  } catch {
    return false;
  }
}

type AppointmentMeta = {
  requestedScheduledAt?: string | null;
  payment?: {
    method?: 'BANK_TRANSFER' | 'STRIPE_CARD';
    status?: string;
    reference?: string | null;
    total?: number;
    currency?: string;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
    paidAt?: string | null;
    confirmedAt?: string | null;
    releasedAt?: string | null;
    noShowMarkedAt?: string | null;
    conflictReason?: string | null;
    providerTxId?: string | null;
  };
  meetingLink?: string | null;
  plainNotes?: string | null;
};

function parseAppointmentMeta(notes?: string | null): AppointmentMeta | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === 'object' && parsed ? (parsed as AppointmentMeta) : null;
  } catch {
    return null;
  }
}

function serializeAppointmentMeta(meta: AppointmentMeta): string {
  return JSON.stringify(meta);
}

function parseProfessionalSlotInterval(value: unknown): 20 | 30 | 45 {
  const parsed = Number(value);
  if (parsed === 20 || parsed === 30 || parsed === 45) return parsed;
  return 30;
}

function isValidSlotForInterval(date: Date, intervalMinutes: number): boolean {
  return date.getSeconds() === 0 && date.getMilliseconds() === 0 && date.getMinutes() % intervalMinutes === 0;
}

async function isStripeEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.securityAuditEvent.findFirst({
    where: {
      action: 'stripe.webhook.processed',
      conversationId: eventId,
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function markStripeEventProcessed(event: any): Promise<void> {
  await prisma.securityAuditEvent.create({
    data: {
      action: 'stripe.webhook.processed',
      conversationId: event.id,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        livemode: event.livemode,
      } as any,
    },
  });
}

const apiCorsDelegate: cors.CorsOptionsDelegate<express.Request> = (req, callback) => {
  const origin = req.header('origin');
  if (!origin) {
    callback(null, { origin: true, credentials: true });
    return;
  }

  const forwardedHost = String(req.header('x-forwarded-host') || '').split(',')[0].trim();
  const host = String(req.header('host') || '').trim();
  const requestHost = forwardedHost || host;
  const forwardedProto = String(req.header('x-forwarded-proto') || '').split(',')[0].trim();
  const requestProto = forwardedProto || req.protocol || 'https';
  const requestOrigin = requestHost ? `${requestProto}://${requestHost}` : '';
  const isAllowedByEnv = allowedOriginSet.has(origin);
  const isSameRequestOrigin = Boolean(requestOrigin && origin === requestOrigin);
  const isSameHost = originMatchesRequestHost(origin, requestHost);

  if (isAllowedByEnv || isSameRequestOrigin || isSameHost) {
    callback(null, { origin: true, credentials: true });
    return;
  }

  logger.warn({ origin, env: env.NODE_ENV, requestOrigin }, 'CORS bloqueado');
  callback(new Error(`CORS bloqueado para: ${origin}`));
};

app.use('/api', cors(apiCorsDelegate));

// â”€â”€â”€ Stripe Webhook (Debe ir ANTES de express.json) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Stripe necesita el raw body para verificar la firma criptogrÃ¡fica.
// Si STRIPE_SECRET_KEY no estÃ¡ configurada, el endpoint responde 503
// en lugar de tumbar el servidor al arrancar.
app.post('/api/webhooks/stripe', webhookLimiter, express.raw({ type: 'application/json' }), async (req, res) => {
  // ValidaciÃ³n temprana: si Stripe no estÃ¡ configurado, responder limpiamente
  let stripe: any;
  try {
    stripe = getStripe();
  } catch {
    logger.warn('[Stripe] Webhook recibido pero Stripe no estÃ¡ configurado. Ignorando.');
    return res.status(503).json({ error: 'Stripe no estÃ¡ configurado en este entorno.' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Falta firma o secreto de webhook');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error({ err }, 'Error de firma de Webhook Stripe');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (await isStripeEventProcessed(event.id)) {
      return res.status(200).json({ received: true, idempotent: true });
    }
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        logger.info({ orderId }, 'Pago completado. Transicion a FONDOS_EN_ESCROW');
        await EscrowStateMachine.transition(orderId, 'FONDOS_EN_ESCROW', {
          stripePaymentIntentId: paymentIntent.id,
          stripeEventId: event.id,
        });
      } else {
        logger.warn({ eventId: event.id }, 'PaymentIntent succeeded sin orderId en metadata.');
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const isAppointmentPayment = session.metadata?.kind === 'APPOINTMENT';
      const appointmentId = session.metadata?.appointmentId;

      if (isAppointmentPayment && appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            professional: { include: { user: { select: { id: true, email: true, name: true } } } },
            client: { select: { id: true, email: true, name: true } },
          },
        });

        if (!appointment) {
          logger.warn({ appointmentId, sessionId: session.id }, 'Webhook Stripe cita: appointment no encontrado');
        } else {
          const currentMeta = parseAppointmentMeta(appointment.notes) || {};
          const requestedRaw = currentMeta.requestedScheduledAt || session.metadata?.requestedScheduledAt || null;
          const requestedScheduledAt = requestedRaw ? new Date(requestedRaw) : null;

          if (!requestedScheduledAt || Number.isNaN(requestedScheduledAt.getTime())) {
            logger.warn({ appointmentId, sessionId: session.id }, 'Webhook Stripe cita: requestedScheduledAt invalido');
          } else {
            const slotIntervalMinutes = parseProfessionalSlotInterval((appointment.professional as any).slotIntervalMinutes);
            if (!isValidSlotForInterval(requestedScheduledAt, slotIntervalMinutes)) {
              logger.warn({ appointmentId, slotIntervalMinutes, requestedScheduledAt: requestedScheduledAt.toISOString() }, 'Webhook Stripe cita: slot invalido para intervalo clinico');
            } else {
              const conflict = await prisma.appointment.findFirst({
                where: {
                  id: { not: appointment.id },
                  professionalId: appointment.professionalId,
                  scheduledAt: requestedScheduledAt,
                  status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
                },
                select: { id: true },
              });

              if (conflict) {
                const conflictMeta: AppointmentMeta = {
                  ...currentMeta,
                  payment: {
                    ...(currentMeta.payment || {}),
                    method: 'STRIPE_CARD',
                    status: 'PAID_SLOT_CONFLICT',
                    stripeSessionId: session.id,
                    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
                    paidAt: new Date().toISOString(),
                    conflictReason: 'SLOT_ALREADY_CONFIRMED',
                  },
                };

                await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { notes: serializeAppointmentMeta(conflictMeta) },
                });

                logger.warn(
                  { appointmentId: appointment.id, conflictId: conflict.id, requestedScheduledAt: requestedScheduledAt.toISOString() },
                  'Pago Stripe recibido para cita con conflicto de horario. Requiere resolucion manual.'
                );
                await logSecurityAuditEvent({
                  action: 'appointment.payment_conflict',
                  appointmentId: appointment.id,
                  targetUserId: appointment.clientId,
                  metadata: { method: 'STRIPE_CARD', status: 'PAID_SLOT_CONFLICT' },
                });
              } else {
                const updatedMeta: AppointmentMeta = {
                  ...currentMeta,
                  requestedScheduledAt: requestedScheduledAt.toISOString(),
                  payment: {
                    ...(currentMeta.payment || {}),
                    method: 'STRIPE_CARD',
                    status: 'PAID_HELD',
                    stripeSessionId: session.id,
                    stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
                    paidAt: new Date().toISOString(),
                    conflictReason: null,
                  },
                };

                const scheduledAppointment = await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: {
                    scheduledAt: requestedScheduledAt,
                    status: 'SCHEDULED',
                    notes: serializeAppointmentMeta(updatedMeta),
                  },
                });

                if (appointment.clientId && appointment.client) {
                  const formattedDate = requestedScheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                  notifyUser({
                    userId: appointment.clientId,
                    type: 'ORDER_STATUS',
                    title: 'Pago recibido y cita confirmada',
                    body: `Tu cita para ${formattedDate} fue confirmada.`,
                    metadata: { appointmentId: scheduledAppointment.id },
                    email: appointment.client.email,
                    emailSubject: 'Cita confirmada - Intecnia',
                    emailHtml: `<p>Recibimos tu pago y tu cita quedo confirmada para ${formattedDate}.</p>`,
                  }).catch((error) => logger.error({ err: error, appointmentId: scheduledAppointment.id }, 'Error notificando confirmacion de cita al cliente'));
                }

                const formattedDate = requestedScheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
                notifyUser({
                  userId: appointment.professional.userId,
                  type: 'ORDER_STATUS',
                  title: 'Nueva cita confirmada con pago',
                  body: `Se confirmo una cita para ${formattedDate}.`,
                  metadata: { appointmentId: scheduledAppointment.id },
                  email: appointment.professional.user.email,
                  emailSubject: 'Cita confirmada por pago - Intecnia',
                  emailHtml: `<p>Se confirmo una cita con pago exitoso para ${formattedDate}.</p>`,
                }).catch((error) => logger.error({ err: error, appointmentId: scheduledAppointment.id }, 'Error notificando confirmacion de cita al profesional'));

                await logSecurityAuditEvent({
                  action: 'appointment.payment_confirmed',
                  appointmentId: scheduledAppointment.id,
                  targetUserId: appointment.clientId,
                  metadata: { method: 'STRIPE_CARD', status: 'PAID_HELD' },
                });
              }
            }
          }
        }
      }
    }
    await markStripeEventProcessed(event);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err, eventId: event.id, eventType: event.type }, 'Error procesando evento de Stripe');
    return res.status(500).json({ error: 'No se pudo procesar el webhook de Stripe' });
  }
});

// â”€â”€â”€ Middleware Global JSON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(express.json());
app.use(cookieParser());
app.use('/api', apiLimiter);

app.post(
  '/api/webhooks/bank-transfer',
  webhookLimiter,
  (req, res, next) => {
    if (!env.BANK_TRANSFER_WEBHOOK_SECRET) {
      return res.status(503).json({ error: 'Webhook bancario no configurado.' });
    }
    return verifyWebhookSignature(env.BANK_TRANSFER_WEBHOOK_SECRET)(req, res, next);
  },
  async (req, res) => {
    try {
      const adaptedWebhook = adaptBankTransferWebhook(req.body);
      if (!adaptedWebhook.ok) {
        return res.status(adaptedWebhook.statusCode).json({ error: adaptedWebhook.error });
      }
      if (adaptedWebhook.ignored) {
        return res.json({ received: true, ignored: true, reason: adaptedWebhook.reason });
      }
      const { appointmentId, transferReference, amount, currency, paidAt, providerTxId, provider, rawStatus } = adaptedWebhook.data;

      const normalizedAppointmentId = String(appointmentId || '').trim();
      const normalizedReference = String(transferReference || '').trim();
      if (!normalizedAppointmentId || normalizedReference.length < 4) {
        return res.status(400).json({ error: 'appointmentId y transferReference son obligatorios.' });
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: normalizedAppointmentId },
        include: {
          professional: { include: { user: { select: { id: true, email: true } } } },
          client: { select: { id: true, email: true, name: true } },
        },
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Cita no encontrada' });
      }

      const currentMeta = parseAppointmentMeta(appointment.notes) || {};
      const expectedPayment = currentMeta.payment || {};
      if (String(expectedPayment.method || '').toUpperCase() !== 'BANK_TRANSFER') {
        return res.status(400).json({ error: 'La cita no corresponde a transferencia bancaria.' });
      }

      if (appointment.status !== 'PENDING_PAYMENT') {
        return res.json({ received: true, idempotent: true, status: appointment.status });
      }

      if (String(expectedPayment.reference || '').trim() !== normalizedReference) {
        return res.status(400).json({ error: 'La referencia no coincide con la solicitud de cita.' });
      }

      const expectedTotal = Number(expectedPayment.total || 0);
      const incomingAmount = Number(amount || 0);
      if (expectedTotal > 0 && incomingAmount > 0 && Math.abs(expectedTotal - incomingAmount) > 0.01) {
        return res.status(400).json({ error: 'El monto no coincide con la solicitud registrada.' });
      }
      if (currency && expectedPayment.currency && String(currency).toUpperCase() !== String(expectedPayment.currency).toUpperCase()) {
        return res.status(400).json({ error: 'La moneda no coincide con la solicitud registrada.' });
      }

      const requestedRaw = currentMeta.requestedScheduledAt || null;
      const requestedScheduledAt = requestedRaw ? new Date(requestedRaw) : null;
      if (!requestedScheduledAt || Number.isNaN(requestedScheduledAt.getTime())) {
        return res.status(400).json({ error: 'No existe horario solicitado para confirmar la cita.' });
      }

      const slotIntervalMinutes = parseProfessionalSlotInterval((appointment.professional as any).slotIntervalMinutes);
      if (!isValidSlotForInterval(requestedScheduledAt, slotIntervalMinutes)) {
        return res.status(400).json({ error: 'El horario solicitado no respeta el intervalo clinico configurado.' });
      }

      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          professionalId: appointment.professionalId,
          scheduledAt: requestedScheduledAt,
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        select: { id: true },
      });

      if (conflict) {
        const conflictMeta: AppointmentMeta = {
          ...currentMeta,
          payment: {
            ...expectedPayment,
            method: 'BANK_TRANSFER',
            status: 'PAID_SLOT_CONFLICT',
            paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
            conflictReason: 'SLOT_ALREADY_CONFIRMED',
          },
        };

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notes: serializeAppointmentMeta(conflictMeta) },
        });

        await logSecurityAuditEvent({
          action: 'appointment.payment_conflict',
          appointmentId: appointment.id,
          targetUserId: appointment.clientId,
          metadata: { method: 'BANK_TRANSFER', status: 'PAID_SLOT_CONFLICT', providerTxId: providerTxId || null, provider, rawStatus },
        });

        return res.json({ received: true, conflict: true });
      }

      const confirmedMeta: AppointmentMeta = {
        ...currentMeta,
        requestedScheduledAt: requestedScheduledAt.toISOString(),
        payment: {
          ...expectedPayment,
          method: 'BANK_TRANSFER',
          status: 'PAID_HELD',
          paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
          confirmedAt: new Date().toISOString(),
          conflictReason: null,
          providerTxId: providerTxId ? String(providerTxId) : undefined,
        },
      };

      const scheduledAppointment = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduledAt: requestedScheduledAt,
          status: 'SCHEDULED',
          notes: serializeAppointmentMeta(confirmedMeta),
        },
      });

      if (appointment.clientId && appointment.client) {
        const formattedDate = requestedScheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
        notifyUser({
          userId: appointment.clientId,
          type: 'ORDER_STATUS',
          title: 'Pago recibido y cita confirmada',
          body: `Tu cita para ${formattedDate} fue confirmada.`,
          metadata: { appointmentId: scheduledAppointment.id },
          email: appointment.client.email,
          emailSubject: 'Cita confirmada - Intecnia',
          emailHtml: `<p>Recibimos tu pago por transferencia y tu cita quedo confirmada para ${formattedDate}.</p>`,
        }).catch((error) => logger.error({ err: error, appointmentId: scheduledAppointment.id }, 'Error notificando confirmacion de cita al cliente'));
      }

      notifyUser({
        userId: appointment.professional.userId,
        type: 'ORDER_STATUS',
        title: 'Nueva cita confirmada con pago',
        body: `Se confirmo una cita para ${requestedScheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}.`,
        metadata: { appointmentId: scheduledAppointment.id },
        email: appointment.professional.user.email,
        emailSubject: 'Cita confirmada por transferencia - Intecnia',
        emailHtml: `<p>Se confirmo una cita con pago validado por transferencia.</p>`,
      }).catch((error) => logger.error({ err: error, appointmentId: scheduledAppointment.id }, 'Error notificando confirmacion de cita al profesional'));

      await logSecurityAuditEvent({
        action: 'appointment.payment_confirmed',
        appointmentId: scheduledAppointment.id,
        targetUserId: appointment.clientId,
        metadata: { method: 'BANK_TRANSFER', status: 'PAID_HELD', providerTxId: providerTxId || null, provider, rawStatus },
      });

      return res.json({ received: true, appointmentId: scheduledAppointment.id, status: 'SCHEDULED' });
    } catch (error) {
      logger.error({ err: error }, 'Error procesando webhook bancario');
      return res.status(500).json({ error: 'Error interno procesando webhook bancario' });
    }
  },
);

// â”€â”€â”€ Multer Config se ha movido a src/lib/upload.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { appointmentsRouter } from './routes/appointments';
import { professionalsRouter } from './routes/professionals';
import { ordersRouter } from './routes/orders';
import { messagesRouter } from './routes/messages';
import { adminRouter } from './routes/admin';
import { verificationRouter } from './routes/verification';
import { availabilityRouter } from './routes/availability';
import { remindersRouter } from './routes/reminders';

// â”€â”€â”€ Servir archivos subidos localmente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const uploadsDir = path.join(__dirname, '../uploads');
const publicUploadsDir = path.join(uploadsDir, 'public');
if (!fs.existsSync(publicUploadsDir)) {
  fs.mkdirSync(publicUploadsDir, { recursive: true });
}
app.use('/uploads/public', express.static(publicUploadsDir));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/professionals', professionalsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/reminders', remindersRouter);

// â”€â”€â”€ Servir el build del frontend React â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const frontendDist = path.join(__dirname, '../public');
app.use(express.static(frontendDist));

// â”€â”€â”€ Healthcheck â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', async (req, res) => {
  const checks: Record<string, string> = {};

  // DB check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (e) {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    checks,
  });
});






/**
 * AI Chat Endpoint (OpenAI)
 * Rate Limited: 20 requests/min por IP para proteger la cuota de OpenAI
 */
type ChatHistoryItem = { sender?: string; text?: string };
type ChatNextAction = 'BOOK_ON_CALENDAR' | 'HANDOFF_HUMAN' | 'INFO';

const normalizeChatText = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 1200);

const normalizeForIntent = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const sanitizeChatHistory = (history: unknown): Array<{ sender: 'user' | 'bot'; text: string }> => {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-8)
    .map((item) => {
      const entry = item as ChatHistoryItem;
      const sender: 'user' | 'bot' = entry?.sender === 'user' ? 'user' : 'bot';
      const text = normalizeChatText(entry?.text);
      return { sender, text };
    })
    .filter((entry) => Boolean(entry.text));
};

const inferNextAction = (userMessage: string, assistantReply: string): ChatNextAction => {
  const intentText = `${normalizeForIntent(userMessage)} ${normalizeForIntent(assistantReply)}`;
  const handoffSignals = [
    'quiero que me contacten',
    'quiero hablar con',
    'hablar con',
    'llamame',
    'whatsapp',
    'seguimiento',
    'contactenme',
    'contactarme',
    'te contactara',
    'te contactara el profesional',
  ];
  if (handoffSignals.some((signal) => intentText.includes(signal))) {
    return 'HANDOFF_HUMAN';
  }

  const bookingSignals = [
    'calendario',
    'agenda',
    'agendar',
    'cita',
    'horario',
    'reserv',
    'disponible',
  ];
  if (bookingSignals.some((signal) => intentText.includes(signal))) {
    return 'BOOK_ON_CALENDAR';
  }

  return 'INFO';
};

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes enviados. Por favor espera un momento antes de continuar.' },
});
app.post('/api/chat', authenticate, chatLimiter, async (req, res, next) => {
  try {
    const rawMessage = normalizeChatText(req.body?.message);
    const rawProfessionalName = normalizeChatText(req.body?.professional);
    const rawProfessionalId = normalizeChatText(req.body?.professionalId);
    const history = sanitizeChatHistory(req.body?.history);

    if (!rawMessage) {
      return res.status(400).json({ error: 'El campo message es requerido' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI no configurado en el servidor' });
    }

    let professionalContext = rawProfessionalName || 'el profesional del perfil';
    if (rawProfessionalId) {
      const professionalProfile = await prisma.professional.findUnique({
        where: { id: rawProfessionalId },
        include: {
          user: { select: { name: true } },
        },
      });

      if (professionalProfile) {
        const name = professionalProfile.user?.name || rawProfessionalName || 'Profesional';
        const title = professionalProfile.title || 'Especialista';
        const category = professionalProfile.category ? String(professionalProfile.category).replaceAll('_', ' ') : '';
        professionalContext = `${name} - ${title}${category ? ` - Categoria: ${category}` : ''}`;
      }
    }

    const systemPrompt = `Eres un asistente de conversion de Intecnia para el perfil: ${professionalContext}.

Objetivo principal:
- Guiar al usuario a reservar en el calendario visible en la parte superior del perfil.

Reglas estrictas:
- Responde en espanol mexicano claro, maximo 2 frases.
- Siempre termina con una accion concreta para avanzar a la agenda/calendario.
- No inventes precios, horarios ni datos que no tengas.
- Si el usuario pide contacto humano, indica que se enviara su solicitud al profesional.
- No digas que ya agendaste automaticamente; la cita se confirma desde el calendario del perfil.
- Si la duda no es de agenda o servicio, redirige con tacto al siguiente paso de reserva.`;

    const chatHistory = history.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: rawMessage },
        ],
        max_tokens: 300,
        temperature: 0.45,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      logger.error({ errText }, 'OpenAI error');
      return res.status(502).json({ error: 'Error al contactar OpenAI' });
    }

    const data = await openaiResponse.json() as any;
    const responseMessage = data.choices?.[0]?.message;
    const reply = normalizeChatText(responseMessage?.content) || 'Para continuar, usa el calendario del perfil y selecciona un horario disponible para tu cita.';
    const nextAction = inferNextAction(rawMessage, reply);

    res.json({ output: reply, nextAction });

  } catch (error) {
    next(error);
  }
});
// â”€â”€â”€ SPA Fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

import { globalErrorHandler } from './middleware/errorHandler';

Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

app.listen(Number(port), '0.0.0.0', () => {
  logger.info(
    {
      port: Number(port),
      env: process.env.NODE_ENV,
      frontendDist,
      orm: 'Prisma Client',
    },
    'Intecnia backend iniciado'
  );

  // âœ… AGREGAR AQUÃ:
  startEscrowCron();
});

