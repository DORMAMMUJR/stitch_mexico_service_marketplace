import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/db';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { notifyUser } from '../lib/notifications';
import { uploadPrivateDoc } from '../lib/upload';
import { logger } from '../lib/logger';
import { getStripe } from '../lib/stripe';
import { env } from '../config/env';
import { logSecurityAuditEvent } from '../lib/securityAudit';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ensureSlotInsideAvailability as ensureMedicalSlotInsideAvailability, getEffectiveAvailability } from '../services/appointments/availability';
import { recordAppointmentEvent } from '../services/appointments/events';
import { evaluateCancellationPolicy } from '../services/appointments/policies';
import { createDefaultReminderJobs } from '../services/reminders';

type PaymentMethod = 'BANK_TRANSFER' | 'STRIPE_CARD';
type VideoProvider = 'jitsi' | 'zoom' | 'meet';

type AppointmentVideoSession = {
  provider: VideoProvider;
  roomName?: string | null;
  joinUrl?: string | null;
  embedAllowed?: boolean;
  status?: 'ACTIVE' | 'EXTERNAL';
  source?: 'AUTO' | 'MANUAL' | 'LEGACY';
  createdAt?: string | null;
  updatedAt?: string | null;
  lastTokenIssuedAt?: string | null;
  lastTokenExpiresAt?: string | null;
  lastTokenIssuedTo?: string | null;
  lastOpenedAt?: string | null;
  lastOpenedBy?: string | null;
};

type AppointmentMeta = {
  plainNotes?: string | null;
  requestedScheduledAt?: string | null;
  cancellationPolicy?: Record<string, unknown> | null;
  payment?: {
    method?: PaymentMethod;
    status?: string;
    reference?: string | null;
    proofUrl?: string | null;
    basePrice?: number;
    commissionRate?: number;
    commission?: number;
    total?: number;
    currency?: string;
    paidAt?: string | null;
    submittedAt?: string | null;
    confirmedAt?: string | null;
    releasedAt?: string | null;
    noShowMarkedAt?: string | null;
    stripeSessionId?: string | null;
    stripeSessionUrl?: string | null;
    stripePaymentIntentId?: string | null;
  };
  meetingLink?: string | null;
  videoSession?: AppointmentVideoSession | null;
};

const PAYMENT_PROTECTION_POLICY = {
  paymentOptions: {
    depositPercent: 50,
    fullPaymentPercent: 100,
    defaultPaymentPercent: 100,
    policy: 'DEPOSIT_OR_FULL_PAYMENT',
  },
  platformCommission: {
    rate: 0.1,
    chargedTo: 'CLIENT',
    refundable: false,
  },
  refunds: {
    before24h: 'FULL_SERVICE_REFUND',
    within24h: 'REVIEW_REQUIRED',
    afterServiceStarted: 'DISPUTE_REQUIRED',
  },
  disputes: {
    windowHours: 72,
    handledBy: 'ADMIN_REVIEW',
  },
  receipts: {
    receiptProvided: true,
    invoiceRequest: 'AVAILABLE_AFTER_PAYMENT',
  },
  noShow: {
    policy: 'FUNDS_HELD_FOR_REVIEW',
    professionalCanMark: true,
    adminReviewRequired: true,
  },
};

const VIDEO_TOKEN_TTL_SECONDS = 60 * 5;
const VIDEO_PROVIDERS: VideoProvider[] = ['jitsi', 'zoom', 'meet'];
const APPOINTMENT_TIME_ZONE = 'America/Mexico_City';
const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: APPOINTMENT_TIME_ZONE,
  weekday: 'short',
});
const HHMM_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APPOINTMENT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const router = Router();
const localPrivateUploadsDir = path.resolve(__dirname, '../../uploads/private');
const hasAwsPrivateStorage =
  !!process.env.AWS_REGION &&
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_S3_BUCKET_NAME;
const privateS3Client = hasAwsPrivateStorage
  ? new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

router.post('/upload-transfer-proof', optionalAuthenticate, uploadPrivateDoc.single('proof'), async (req: any, res: any) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Debes subir un comprobante de pago (PNG/JPG).' });
  }

  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Formato no permitido. Usa PNG, JPG o WEBP.' });
  }

  const proofUrl = typeof file.key === 'string' && file.key.startsWith('private/')
    ? `private:s3:${file.key}`
    : `private:local:${String(file.filename || '').trim()}`;
  return res.json({ proofUrl, message: 'Comprobante subido correctamente' });
});

function canAccessAppointmentProof(reqUser: any, appointment: any): boolean {
  const role = String(reqUser?.role || '');
  if (role === 'ADMIN') return true;
  if (!reqUser?.userId) return false;
  if (role === 'CLIENT') return appointment.clientId === reqUser.userId;
  if (role === 'PROFESSIONAL') return appointment.professional?.userId === reqUser.userId;
  return false;
}

function resolveLocalProofPath(filename: string): string | null {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return null;
  const resolved = path.resolve(localPrivateUploadsDir, safeName);
  if (!resolved.startsWith(localPrivateUploadsDir)) return null;
  return resolved;
}

router.get('/:id/transfer-proof', authenticate, async (req: any, res: any, next: any) => {
  try {
    const appointmentId = String(req.params.id || '').trim();
    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId requerido' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        professional: { select: { userId: true } },
        notes: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (!canAccessAppointmentProof(req.user, appointment)) {
      logger.warn(
        { appointmentId, requesterId: req.user?.userId, role: req.user?.role },
        'Acceso denegado a comprobante de transferencia',
      );
      return res.status(403).json({ error: 'No autorizado para ver este comprobante' });
    }

    const meta = parseAppointmentMeta(appointment.notes);
    const proofUrl = String(meta?.payment?.proofUrl || '').trim();
    if (!proofUrl) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (proofUrl.startsWith('private:local:')) {
      const filename = proofUrl.replace('private:local:', '').trim();
      const localPath = resolveLocalProofPath(filename);
      if (!localPath || !fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Comprobante no encontrado' });
      }
      return res.sendFile(localPath);
    }

    if (proofUrl.startsWith('private:s3:')) {
      const key = proofUrl.replace('private:s3:', '').trim();
      if (!key || !key.startsWith('private/')) {
        return res.status(404).json({ error: 'Comprobante no encontrado' });
      }
      if (!privateS3Client || !process.env.AWS_S3_BUCKET_NAME) {
        logger.error({ appointmentId }, 'S3 no configurado para lectura de comprobantes privados');
        return res.status(503).json({ error: 'Comprobante no disponible temporalmente' });
      }

      const object = await privateS3Client.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
        }),
      );

      if (!object.Body) {
        return res.status(404).json({ error: 'Comprobante no encontrado' });
      }

      if (object.ContentType) {
        res.setHeader('Content-Type', object.ContentType);
      }
      if (object.ContentLength != null) {
        res.setHeader('Content-Length', String(object.ContentLength));
      }

      const body = object.Body as any;
      if (typeof body.pipe === 'function') {
        return body.pipe(res);
      }
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (proofUrl.startsWith('/uploads/private/')) {
      const legacyFilename = proofUrl.replace('/uploads/private/', '').trim();
      const localPath = resolveLocalProofPath(legacyFilename);
      if (!localPath || !fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Comprobante no encontrado' });
      }
      return res.sendFile(localPath);
    }

    logger.warn({ appointmentId }, 'Formato de proofUrl privado no reconocido');
    return res.status(404).json({ error: 'Comprobante no encontrado' });
  } catch (error) {
    return next(error);
  }
});

function parseScheduledAt(raw: string): Date | null {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayOfWeek(date: Date): number {
  const key = WEEKDAY_FORMATTER.format(date).toLowerCase();
  return WEEKDAY_INDEX[key] ?? date.getDay();
}

function getSlotTimeHHMM(date: Date): string {
  return HHMM_FORMATTER.format(date);
}

function isThirtyMinuteSlot(date: Date): boolean {
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();
  return (minutes === 0 || minutes === 30) && seconds === 0 && ms === 0;
}

function parseProfessionalSlotInterval(value: unknown): 20 | 30 | 45 {
  const parsed = Number(value);
  if (parsed === 20 || parsed === 30 || parsed === 45) return parsed;
  return 30;
}

function isValidSlotForInterval(date: Date, intervalMinutes: number): boolean {
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();
  return minutes % intervalMinutes === 0 && seconds === 0 && ms === 0;
}

function canUseVideoForStatus(status: string | null | undefined): boolean {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'CONFIRMED' || normalized === 'SCHEDULED' || normalized === 'IN_PROGRESS';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

function extractMeetingLink(notes?: string | null): string | null {
  const meta = parseAppointmentMeta(notes);
  if (meta?.meetingLink && typeof meta.meetingLink === 'string') return meta.meetingLink;
  return null;
}

function sanitizeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function inferVideoProviderFromUrl(url: string): VideoProvider {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('zoom.us') || host.includes('zoom.com')) return 'zoom';
    if (host.includes('meet.google')) return 'meet';
    if (host.includes('jitsi') || host.includes('8x8.vc')) return 'jitsi';
  } catch {
    // Ignore parsing errors and use default.
  }
  return 'meet';
}

function normalizeVideoProvider(raw: unknown, fallbackUrl?: string | null): VideoProvider {
  const normalized = String(raw ?? '').trim().toLowerCase();
  if (VIDEO_PROVIDERS.includes(normalized as VideoProvider)) return normalized as VideoProvider;
  if (fallbackUrl) return inferVideoProviderFromUrl(fallbackUrl);
  return 'jitsi';
}

function buildAutoJitsiSession(appointmentId: string): AppointmentVideoSession {
  const roomName = `intecnia-${appointmentId}`;
  return {
    provider: 'jitsi',
    roomName,
    joinUrl: `https://meet.jit.si/${roomName}`,
    embedAllowed: true,
    status: 'ACTIVE',
    source: 'AUTO',
  };
}

function normalizeVideoSession(meta: AppointmentMeta | null, fallbackMeetingLink: string | null): AppointmentVideoSession | null {
  const raw = meta?.videoSession;
  if (raw && typeof raw === 'object') {
    const joinUrl = typeof raw.joinUrl === 'string' ? sanitizeHttpUrl(raw.joinUrl) : null;
    const provider = normalizeVideoProvider(raw.provider, joinUrl || fallbackMeetingLink);
    const roomName = typeof raw.roomName === 'string' && raw.roomName.trim() ? raw.roomName.trim() : null;
    if (joinUrl || roomName) {
      return {
        provider,
        roomName,
        joinUrl,
        embedAllowed: provider === 'jitsi',
        status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
        source: raw.source === 'AUTO' || raw.source === 'MANUAL' || raw.source === 'LEGACY' ? raw.source : 'MANUAL',
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
        lastTokenIssuedAt: typeof raw.lastTokenIssuedAt === 'string' ? raw.lastTokenIssuedAt : null,
        lastTokenExpiresAt: typeof raw.lastTokenExpiresAt === 'string' ? raw.lastTokenExpiresAt : null,
        lastTokenIssuedTo: typeof raw.lastTokenIssuedTo === 'string' ? raw.lastTokenIssuedTo : null,
        lastOpenedAt: typeof raw.lastOpenedAt === 'string' ? raw.lastOpenedAt : null,
        lastOpenedBy: typeof raw.lastOpenedBy === 'string' ? raw.lastOpenedBy : null,
      };
    }
  }

  if (fallbackMeetingLink) {
    const joinUrl = sanitizeHttpUrl(fallbackMeetingLink);
    if (!joinUrl) return null;
    const provider = inferVideoProviderFromUrl(joinUrl);
    return {
      provider,
      roomName: provider === 'jitsi' ? joinUrl.split('/').filter(Boolean).pop() || null : null,
      joinUrl,
      embedAllowed: provider === 'jitsi',
      status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
      source: 'LEGACY',
    };
  }

  return null;
}

function upsertVideoSessionMeta(
  appointmentId: string,
  currentMeta: AppointmentMeta | null,
  options: {
    meetingLinkRaw?: unknown;
    providerRaw?: unknown;
    forceAuto?: boolean;
  },
): { nextMeta: AppointmentMeta; videoSession: AppointmentVideoSession; meetingLink: string | null } {
  const nowIso = new Date().toISOString();
  const existingMeetingLink = currentMeta?.meetingLink && typeof currentMeta.meetingLink === 'string' ? currentMeta.meetingLink : null;
  let videoSession = normalizeVideoSession(currentMeta, existingMeetingLink);

  const meetingLinkRaw = typeof options.meetingLinkRaw === 'string' ? options.meetingLinkRaw.trim() : '';
  if (meetingLinkRaw) {
    const sanitized = sanitizeHttpUrl(meetingLinkRaw);
    if (!sanitized) {
      throw new Error('Debes enviar un link valido (http/https)');
    }
    const provider = normalizeVideoProvider(options.providerRaw, sanitized);
    videoSession = {
      provider,
      roomName: provider === 'jitsi' ? sanitized.split('/').filter(Boolean).pop() || null : null,
      joinUrl: sanitized,
      embedAllowed: provider === 'jitsi',
      status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
      source: 'MANUAL',
      createdAt: videoSession?.createdAt || nowIso,
      updatedAt: nowIso,
      lastTokenIssuedAt: videoSession?.lastTokenIssuedAt || null,
      lastTokenExpiresAt: videoSession?.lastTokenExpiresAt || null,
      lastTokenIssuedTo: videoSession?.lastTokenIssuedTo || null,
      lastOpenedAt: videoSession?.lastOpenedAt || null,
      lastOpenedBy: videoSession?.lastOpenedBy || null,
    };
  } else if (!videoSession || options.forceAuto) {
    const autoSession = buildAutoJitsiSession(appointmentId);
    videoSession = {
      ...autoSession,
      createdAt: videoSession?.createdAt || nowIso,
      updatedAt: nowIso,
      lastTokenIssuedAt: videoSession?.lastTokenIssuedAt || null,
      lastTokenExpiresAt: videoSession?.lastTokenExpiresAt || null,
      lastTokenIssuedTo: videoSession?.lastTokenIssuedTo || null,
      lastOpenedAt: videoSession?.lastOpenedAt || null,
      lastOpenedBy: videoSession?.lastOpenedBy || null,
    };
  } else {
    videoSession = {
      ...videoSession,
      updatedAt: nowIso,
      createdAt: videoSession.createdAt || nowIso,
      lastTokenIssuedAt: videoSession.lastTokenIssuedAt || null,
      lastTokenExpiresAt: videoSession.lastTokenExpiresAt || null,
      lastTokenIssuedTo: videoSession.lastTokenIssuedTo || null,
      lastOpenedAt: videoSession.lastOpenedAt || null,
      lastOpenedBy: videoSession.lastOpenedBy || null,
    };
  }

  const nextMeta: AppointmentMeta = {
    ...(currentMeta || {}),
    meetingLink: videoSession.joinUrl || existingMeetingLink || null,
    videoSession,
  };

  return {
    nextMeta,
    videoSession,
    meetingLink: nextMeta.meetingLink || null,
  };
}

function canAccessAppointmentVideo(reqUser: any, appointment: any): boolean {
  const role = String(reqUser?.role || '').toUpperCase();
  const userId = String(reqUser?.userId || '');
  if (!userId) return false;
  if (role === 'ADMIN') return true;
  if (appointment.clientId && appointment.clientId === userId) return true;
  if (appointment.professional?.userId && appointment.professional.userId === userId) return true;
  return false;
}

function getVideoTokenSigner(): { secret: string; algorithm: 'HS256' | 'RS256' } | null {
  const privateKey = env.JWT_PRIVATE_KEY || '';
  const publicKey = env.JWT_PUBLIC_KEY || '';
  const selected = privateKey || publicKey;
  if (!selected) return null;

  if (selected.includes('BEGIN')) {
    if (!selected.includes('PRIVATE KEY')) return null;
    return { secret: selected, algorithm: 'RS256' };
  }

  return { secret: selected, algorithm: 'HS256' };
}

function formatDateForNotification(date: Date): string {
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseRequestedSlotFromMeta(meta: AppointmentMeta | null): Date | null {
  const raw = meta?.requestedScheduledAt;
  if (!raw || typeof raw !== 'string') return null;
  return parseScheduledAt(raw);
}

async function ensureSlotInsideAvailability(professionalId: string, scheduledAt: Date): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const dayOfWeek = getDayOfWeek(scheduledAt);
  const availability = await prisma.availability.findUnique({
    where: {
      professionalId_dayOfWeek: {
        professionalId,
        dayOfWeek,
      },
    },
  });

  if (!availability) {
    return {
      ok: false,
      status: 409,
      error: 'El profesional no tiene disponibilidad configurada para ese dia de la semana',
    };
  }

  const slotTime = getSlotTimeHHMM(scheduledAt);
  if (slotTime < availability.startTime || slotTime >= availability.endTime) {
    return {
      ok: false,
      status: 409,
      error: `El horario solicitado esta fuera del rango disponible (${availability.startTime} - ${availability.endTime})`,
    };
  }

  return { ok: true };
}

async function isScheduledSlotAvailable(professionalId: string, scheduledAt: Date, excludeAppointmentId?: string): Promise<boolean> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId,
      scheduledAt,
      status: { in: ['REQUESTED', 'CONFIRMED', 'PENDING_PAYMENT', 'SCHEDULED', 'IN_PROGRESS'] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });

  return !conflict;
}

async function computePricing(professionalId: string) {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { id: true, hourlyRate: true, presencialRate: true, telemedicineRate: true, homeVisitRate: true, currency: true, user: { select: { name: true } } },
  });

  if (!professional) return null;

  const basePrice = Number(professional.presencialRate ?? professional.telemedicineRate ?? professional.homeVisitRate ?? professional.hourlyRate ?? 0);
  if (!basePrice || basePrice <= 0) {
    return {
      professional,
      error: 'El profesional no tiene tarifa configurada',
    };
  }

  const commissionRate = PAYMENT_PROTECTION_POLICY.platformCommission.rate;
  const commission = round2(basePrice * commissionRate);
  const total = round2(basePrice + commission);
  const depositAmount = round2(total * (PAYMENT_PROTECTION_POLICY.paymentOptions.depositPercent / 100));

  return {
    professional,
    basePrice,
    commissionRate,
    commission,
    total,
    depositAmount,
    currency: professional.currency || 'MXN',
  };
}

router.get('/availability/:professionalId', async (req, res, next) => {
  try {
    const { professionalId } = req.params;

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true, slotIntervalMinutes: true },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const availabilities = await prisma.availability.findMany({
      where: { professionalId },
      orderBy: { dayOfWeek: 'asc' },
    });

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { gte: new Date() },
      },
      select: { scheduledAt: true },
    });

    const bookedTimesByDay = new Map<number, string[]>();
    for (const appointment of bookedAppointments) {
      if (!appointment.scheduledAt) continue;
      const day = getDayOfWeek(appointment.scheduledAt);
      const time = getSlotTimeHHMM(appointment.scheduledAt);
      const list = bookedTimesByDay.get(day) || [];
      list.push(time);
      bookedTimesByDay.set(day, list);
    }

    res.json(availabilities.map((block) => ({
      ...block,
      slotIntervalMinutes: parseProfessionalSlotInterval(professional.slotIntervalMinutes),
      bookedTimes: bookedTimesByDay.get(block.dayOfWeek) || [],
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/availability/:professionalId/effective', async (req, res, next) => {
  try {
    const { professionalId } = req.params;
    const from = req.query.from ? parseScheduledAt(String(req.query.from)) : null;
    const to = req.query.to ? parseScheduledAt(String(req.query.to)) : null;
    const effective = await getEffectiveAvailability(professionalId, from, to);
    if (!effective) return res.status(404).json({ error: 'Profesional no encontrado' });
    res.json(effective);
  } catch (error: any) {
    if (error?.type === 'StripeCardError' || error?.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: error?.message || 'No se pudo procesar el pago con tarjeta.' });
    }
    if (error?.type === 'StripeAuthenticationError' || error?.message?.includes('STRIPE_SECRET_KEY')) {
      return res.status(503).json({ error: 'Pagos con tarjeta no disponibles en este momento.' });
    }
    next(error);
  }
});

router.get('/pricing/:professionalId', async (req, res, next) => {
  try {
    const { professionalId } = req.params;
    const pricing = await computePricing(professionalId);

    if (!pricing?.professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    if ('error' in pricing) {
      return res.status(400).json({ error: pricing.error });
    }

    return res.json({
      professionalId,
      professionalName: pricing.professional.user.name,
      currency: pricing.currency,
      basePrice: pricing.basePrice,
      pricesByMode: {
        presencial: pricing.professional.presencialRate ? Number(pricing.professional.presencialRate) : null,
        online: pricing.professional.telemedicineRate ? Number(pricing.professional.telemedicineRate) : null,
        domicilio: pricing.professional.homeVisitRate ? Number(pricing.professional.homeVisitRate) : null,
      },
      commissionRate: pricing.commissionRate,
      commission: pricing.commission,
      total: pricing.total,
      depositAmount: pricing.depositAmount,
      paymentMethods: ['BANK_TRANSFER', 'STRIPE_CARD'],
      defaultPaymentMethod: 'BANK_TRANSFER',
      paymentGuarantee: PAYMENT_PROTECTION_POLICY.paymentOptions,
      paymentProtection: PAYMENT_PROTECTION_POLICY,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/my', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let appointments;

    if (role === 'PROFESSIONAL') {
      const prof = await prisma.professional.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!prof) return res.json([]);

      appointments = await prisma.appointment.findMany({
        where: { professionalId: prof.id },
        include: {
          client: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, emailVerified: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      });
    } else {
      appointments = await prisma.appointment.findMany({
        where: { clientId: userId },
        include: {
          professional: {
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
        },
        orderBy: { scheduledAt: 'desc' },
      });
    }

    const enhancedAppointments = appointments.map((app: any) => {
      const meta = parseAppointmentMeta(app.notes);
      const meetingLink = extractMeetingLink(app.notes);
      const videoSession = normalizeVideoSession(meta, meetingLink);
      const requestedScheduledAt = parseRequestedSlotFromMeta(meta)?.toISOString() || null;
      if (!app.client) return { ...app, meetingLink, videoSession, requestedScheduledAt };
      const createdAt = app.client.createdAt ? new Date(app.client.createdAt) : null;
      const daysSinceCreated = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : null;
      return {
        ...app,
        meetingLink,
        videoSession,
        requestedScheduledAt,
        client: {
          ...app.client,
          isNew: daysSinceCreated !== null ? daysSinceCreated <= 14 : false,
          isVerified: !!app.client.emailVerified,
        },
      };
    });

    res.json(enhancedAppointments);
  } catch (error) {
    next(error);
  }
});

router.post('/availability', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;

    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden definir disponibilidad' });
    }

    const prof = await prisma.professional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prof) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    const { dayOfWeek, startTime, endTime } = req.body;

    if (dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
      return res.status(400).json({ error: 'dayOfWeek, startTime y endTime son requeridos' });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek debe ser un numero entre 0 (domingo) y 6 (sabado)' });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ error: 'startTime y endTime deben tener formato HH:MM (ej: 09:00)' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime debe ser anterior a endTime' });
    }

    const availability = await prisma.availability.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: prof.id,
          dayOfWeek,
        },
      },
      update: { startTime, endTime },
      create: {
        professionalId: prof.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    res.status(201).json(availability);
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', authenticate, async (req: any, res: any, next: any) => {
  try {
    const clientId = req.user?.userId;
    const {
      professionalId,
      scheduledAt: scheduledAtRaw,
      service,
      notes,
      pricingSnapshot,
    } = req.body;

    if (!professionalId || !scheduledAtRaw) {
      return res.status(400).json({ error: 'professionalId y scheduledAt son requeridos' });
    }

    const scheduledAt = parseScheduledAt(String(scheduledAtRaw));
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt debe ser una fecha ISO valida' });
    }

    if (scheduledAt <= new Date()) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }
    if (!professional.isVerified || professional.verificationStatus !== 'APPROVED') {
      return res.status(403).json({ error: 'El profesional aun no esta verificado para recibir pagos con tarjeta.' });
    }

    if (professional.userId === clientId) {
      return res.status(400).json({ error: 'No puedes agendar una cita contigo mismo' });
    }

    const slotIntervalMinutes = parseProfessionalSlotInterval(professional.slotIntervalMinutes);
    if (!isValidSlotForInterval(scheduledAt, slotIntervalMinutes)) {
      return res.status(400).json({ error: `Las citas deben agendarse en intervalos de ${slotIntervalMinutes} minutos exactos.` });
    }

    const availabilityCheck = await ensureMedicalSlotInsideAvailability(professionalId, scheduledAt);
    if (!availabilityCheck.ok) {
      return res.status(availabilityCheck.status).json({ error: availabilityCheck.error });
    }

    const slotAvailable = await isScheduledSlotAvailable(professionalId, scheduledAt);
    if (!slotAvailable) {
      return res.status(409).json({ error: 'Este horario ya fue confirmado por otro cliente. Elige otro horario.' });
    }

    const pricing = await computePricing(professionalId);
    if (!pricing?.professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }
    if ('error' in pricing) {
      return res.status(400).json({ error: pricing.error });
    }

    const snapshotTotal = Number(pricingSnapshot?.total ?? 0);
    if (snapshotTotal && Math.abs(snapshotTotal - pricing.total) > 0.01) {
      return res.status(400).json({ error: `El precio cambio. Total actual: ${pricing.total}` });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return res.status(503).json({ error: 'Stripe no esta configurado en este entorno.' });
    }

    const appointmentMeta: AppointmentMeta = {
      plainNotes: notes ?? null,
      requestedScheduledAt: scheduledAt.toISOString(),
      payment: {
        method: 'STRIPE_CARD',
        status: 'CHECKOUT_PENDING',
        basePrice: pricing.basePrice,
        commissionRate: pricing.commissionRate,
        commission: pricing.commission,
        total: pricing.total,
        currency: pricing.currency,
        submittedAt: new Date().toISOString(),
      },
      meetingLink: null,
    };

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        guestId: null,
        professionalId,
        service: service ?? null,
        scheduledAt: null,
        notes: serializeAppointmentMeta(appointmentMeta),
        status: 'PENDING_PAYMENT',
      },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: clientId,
      type: 'REQUESTED',
      toStatus: 'PENDING_PAYMENT',
      metadata: { method: 'STRIPE_CARD', requestedScheduledAt: scheduledAt.toISOString() },
    });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: pricing.currency.toLowerCase(),
              unit_amount: Math.round(pricing.total * 100),
              product_data: {
                name: `Cita con ${professional.user.name}`,
                description: service || professional.title || 'Consulta profesional',
              },
            },
          },
        ],
        metadata: {
          kind: 'APPOINTMENT',
          appointmentId: appointment.id,
          professionalId,
          clientId,
          requestedScheduledAt: scheduledAt.toISOString(),
        },
        success_url: `${env.APP_URL}/dashboard?tab=appointments&payment=success&appointmentId=${appointment.id}`,
        cancel_url: `${env.APP_URL}/profile/${professionalId}?payment=cancelled`,
      });

      const updatedMeta: AppointmentMeta = {
        ...appointmentMeta,
        payment: {
          ...appointmentMeta.payment,
          stripeSessionId: session.id,
          stripeSessionUrl: session.url || null,
        },
      };

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { notes: serializeAppointmentMeta(updatedMeta) },
      });

      await logSecurityAuditEvent({
        action: 'appointment.checkout_started',
        actorUserId: clientId,
        appointmentId: appointment.id,
        targetUserId: professional.userId,
        metadata: { method: 'STRIPE_CARD', total: pricing.total },
      });
      logger.info(
        { appointmentId: appointment.id, sessionId: session.id, professionalId, clientId, total: pricing.total },
        'Checkout Stripe inicializado',
      );

      return res.status(201).json({
        appointmentId: appointment.id,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (stripeError) {
      const failedMeta: AppointmentMeta = {
        ...appointmentMeta,
        payment: {
          ...appointmentMeta.payment,
          status: 'CHECKOUT_FAILED',
        },
      };

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          notes: serializeAppointmentMeta(failedMeta),
        },
      });
      logger.error(
        { err: stripeError, appointmentId: appointment.id, professionalId, clientId },
        'Error creando checkout Stripe',
      );

      throw stripeError;
    }
  } catch (error) {
    next(error);
  }
});

router.post('/', optionalAuthenticate, async (req: any, res: any, next: any) => {
  try {
    const clientId = req.user?.userId ?? null;
    const {
      professionalId,
      scheduledAt: scheduledAtRaw,
      service,
      notes,
      paymentMethod,
      transferReference,
      transferProofUrl,
      paymentTotal,
    } = req.body;

    if (!professionalId || !scheduledAtRaw) {
      return res.status(400).json({ error: 'professionalId y scheduledAt son requeridos' });
    }

    const scheduledAt = parseScheduledAt(String(scheduledAtRaw));
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt debe ser una fecha ISO valida (ej: 2025-06-15T10:00:00.000Z)' });
    }

    if (scheduledAt <= new Date()) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    if (clientId && professional.userId === clientId) {
      return res.status(400).json({ error: 'No puedes agendar una cita contigo mismo' });
    }

    const slotIntervalMinutes = parseProfessionalSlotInterval(professional.slotIntervalMinutes);
    if (!isValidSlotForInterval(scheduledAt, slotIntervalMinutes)) {
      return res.status(400).json({ error: `Las citas deben agendarse en intervalos de ${slotIntervalMinutes} minutos exactos.` });
    }

    const normalizedMethod: PaymentMethod = paymentMethod === 'STRIPE_CARD' ? 'STRIPE_CARD' : 'BANK_TRANSFER';
    if (normalizedMethod !== 'BANK_TRANSFER') {
      return res.status(400).json({ error: 'Para pago con tarjeta usa el endpoint /api/appointments/checkout' });
    }

    if (!transferReference || String(transferReference).trim().length < 4) {
      return res.status(400).json({ error: 'Referencia de transferencia invalida' });
    }

    if (!transferProofUrl || typeof transferProofUrl !== 'string') {
      return res.status(400).json({ error: 'Debes adjuntar foto del comprobante de transferencia.' });
    }

    const pricing = await computePricing(professionalId);
    if (!pricing?.professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }
    if ('error' in pricing) {
      return res.status(400).json({ error: pricing.error });
    }

    const paidTotal = Number(paymentTotal ?? 0);
    if (!paidTotal || Math.abs(paidTotal - pricing.total) > 0.01) {
      return res.status(400).json({ error: `Monto invalido. Total esperado: ${pricing.total}` });
    }

    const availabilityCheck = await ensureMedicalSlotInsideAvailability(professionalId, scheduledAt);
    if (!availabilityCheck.ok) {
      return res.status(availabilityCheck.status).json({ error: availabilityCheck.error });
    }

    const slotAvailable = await isScheduledSlotAvailable(professionalId, scheduledAt);
    if (!slotAvailable) {
      return res.status(409).json({ error: 'Este horario ya fue confirmado por otro cliente. Por favor elige otro slot.' });
    }

    let guestId: string | null = null;
    if (!clientId) {
      const rawGuestId = req.body.guestId;
      if (rawGuestId && /^guest_\d+$/.test(rawGuestId)) {
        guestId = rawGuestId;
      } else {
        guestId = `guest_${Date.now()}`;
      }
    }

    const appointmentMeta: AppointmentMeta = {
      plainNotes: notes ?? null,
      requestedScheduledAt: scheduledAt.toISOString(),
      payment: {
        method: 'BANK_TRANSFER',
        status: 'TRANSFER_SUBMITTED',
        reference: String(transferReference).trim(),
        proofUrl: transferProofUrl,
        basePrice: pricing.basePrice,
        commissionRate: pricing.commissionRate,
        commission: pricing.commission,
        total: pricing.total,
        currency: pricing.currency,
        submittedAt: new Date().toISOString(),
      },
      meetingLink: null,
    };

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        guestId,
        professionalId,
        service: service ?? null,
        scheduledAt: null,
        notes: serializeAppointmentMeta(appointmentMeta),
        status: 'PENDING_PAYMENT',
      },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: clientId,
      type: 'REQUESTED',
      toStatus: 'PENDING_PAYMENT',
      metadata: { method: 'BANK_TRANSFER', requestedScheduledAt: scheduledAt.toISOString() },
    });

    notifyUser({
      userId: professional.userId,
      type: 'ORDER_STATUS',
      title: 'Nueva solicitud de cita pendiente de validar pago',
      body: `Tienes una solicitud para ${formatDateForNotification(scheduledAt)}. Confirma el pago para bloquear el horario.`,
      metadata: { appointmentId: appointment.id },
      email: professional.user.email,
      emailSubject: 'Nueva solicitud de cita - Intecnia',
      emailHtml: `
        <h2>Tienes una nueva solicitud de cita</h2>
        <p>Un cliente envio comprobante de transferencia.</p>
        <p><strong>Horario solicitado:</strong> ${formatDateForNotification(scheduledAt)}</p>
        ${service ? `<p><strong>Servicio:</strong> ${service}</p>` : ''}
        ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
        <p>Recuerda: el horario se confirma hasta validar el pago.</p>
      `,
    }).catch((error) => logger.error({ err: error, appointmentId: appointment.id }, 'Error notificando nueva cita al profesional'));

    await logSecurityAuditEvent({
      action: 'appointment.transfer_submitted',
      actorUserId: clientId,
      appointmentId: appointment.id,
      targetUserId: professional.userId,
      metadata: { method: 'BANK_TRANSFER', total: pricing.total },
    });

    res.status(201).json({ message: 'Solicitud creada con pago pendiente de validacion', appointment });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/confirm-transfer', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const { id } = req.params;

    if (!['PROFESSIONAL', 'ADMIN'].includes(String(role))) {
      return res.status(403).json({ error: 'Solo profesionales o admin pueden confirmar pagos por transferencia.' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { user: { select: { id: true, email: true, name: true } } } },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (role === 'PROFESSIONAL' && appointment.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para confirmar esta cita' });
    }

    if (appointment.status !== 'PENDING_PAYMENT') {
      return res.status(400).json({ error: `Solo se pueden confirmar citas en PENDING_PAYMENT. Estado actual: ${appointment.status}` });
    }

    const meta = parseAppointmentMeta(appointment.notes);
    if (meta?.payment?.method !== 'BANK_TRANSFER') {
      return res.status(400).json({ error: 'Esta cita no corresponde a pago por transferencia.' });
    }

    const requestedScheduledAt = parseRequestedSlotFromMeta(meta);
    if (!requestedScheduledAt) {
      return res.status(400).json({ error: 'No se encontro horario solicitado para confirmar.' });
    }
    const slotIntervalMinutes = parseProfessionalSlotInterval(appointment.professional.slotIntervalMinutes);
    if (!isValidSlotForInterval(requestedScheduledAt, slotIntervalMinutes)) {
      return res.status(400).json({ error: `El horario solicitado no respeta el intervalo clinico de ${slotIntervalMinutes} minutos.` });
    }

    const availabilityCheck = await ensureMedicalSlotInsideAvailability(appointment.professionalId, requestedScheduledAt);
    if (!availabilityCheck.ok) {
      return res.status(availabilityCheck.status).json({ error: availabilityCheck.error });
    }

    const slotAvailable = await isScheduledSlotAvailable(appointment.professionalId, requestedScheduledAt, appointment.id);
    if (!slotAvailable) {
      return res.status(409).json({ error: 'Ese horario ya fue confirmado por otra cita. Selecciona otro horario o contacta al cliente.' });
    }

    const updatedMeta: AppointmentMeta = {
      ...(meta || {}),
      payment: {
        ...(meta?.payment || {}),
        method: 'BANK_TRANSFER',
        status: 'PAID_HELD',
        confirmedAt: new Date().toISOString(),
      },
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt: requestedScheduledAt,
        status: 'CONFIRMED',
        notes: serializeAppointmentMeta(updatedMeta),
      },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: 'CONFIRMED',
      fromStatus: appointment.status,
      toStatus: 'CONFIRMED',
      metadata: { method: 'BANK_TRANSFER', scheduledAt: requestedScheduledAt.toISOString() },
    });
    await createDefaultReminderJobs(appointment.id, requestedScheduledAt);

    if (appointment.clientId && appointment.client) {
      notifyUser({
        userId: appointment.clientId,
        type: 'ORDER_STATUS',
        title: 'Pago validado y cita confirmada',
        body: `Tu cita para ${formatDateForNotification(requestedScheduledAt)} fue confirmada.`,
        metadata: { appointmentId: appointment.id },
        email: appointment.client.email,
        emailSubject: 'Tu cita fue confirmada - Intecnia',
        emailHtml: `<p>Tu pago por transferencia fue validado y tu cita quedo confirmada para ${formatDateForNotification(requestedScheduledAt)}.</p>`,
      }).catch((error) => logger.error({ err: error, appointmentId: appointment.id }, 'Error notificando confirmacion al cliente'));
    }

    await logSecurityAuditEvent({
      action: 'appointment.payment_confirmed',
      actorUserId: userId,
      targetUserId: appointment.clientId,
      appointmentId: appointment.id,
      metadata: { method: 'BANK_TRANSFER', status: 'PAID_HELD' },
    });

    res.json({ message: 'Pago validado y cita confirmada', appointment: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/confirm', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { user: { select: { id: true, email: true } } } },
        client: { select: { id: true, email: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    if (role !== 'ADMIN' && appointment.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para confirmar esta cita' });
    }
    if (!['REQUESTED', 'PENDING_PAYMENT', 'SCHEDULED'].includes(appointment.status)) {
      return res.status(400).json({ error: `No se puede confirmar una cita en estado: ${appointment.status}` });
    }

    const meta = parseAppointmentMeta(appointment.notes);
    const scheduledAt = appointment.scheduledAt || parseRequestedSlotFromMeta(meta);
    if (!scheduledAt) return res.status(400).json({ error: 'La cita no tiene horario solicitado' });

    const availabilityCheck = await ensureMedicalSlotInsideAvailability(appointment.professionalId, scheduledAt, appointment.id);
    if (!availabilityCheck.ok) return res.status(availabilityCheck.status).json({ error: availabilityCheck.error });

    const updatedMeta: AppointmentMeta = {
      ...(meta || {}),
      requestedScheduledAt: scheduledAt.toISOString(),
      payment: {
        ...(meta?.payment || {}),
        confirmedAt: new Date().toISOString(),
      },
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt,
        status: 'CONFIRMED',
        notes: serializeAppointmentMeta(updatedMeta),
      },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: 'CONFIRMED',
      fromStatus: appointment.status,
      toStatus: 'CONFIRMED',
      metadata: { scheduledAt: scheduledAt.toISOString() },
    });
    await createDefaultReminderJobs(appointment.id, scheduledAt);

    if (appointment.clientId && appointment.client) {
      notifyUser({
        userId: appointment.clientId,
        type: 'ORDER_STATUS',
        title: 'Cita confirmada',
        body: `Tu cita para ${formatDateForNotification(scheduledAt)} fue confirmada.`,
        metadata: { appointmentId: appointment.id },
        email: appointment.client.email,
        emailSubject: 'Tu cita fue confirmada - Intecnia',
        emailHtml: `<p>Tu cita quedo confirmada para ${formatDateForNotification(scheduledAt)}.</p>`,
      }).catch((error) => logger.error({ err: error, appointmentId: appointment.id }, 'Error notificando confirmacion al cliente'));
    }

    res.json({ message: 'Cita confirmada', appointment: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/reschedule', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;
    const scheduledAt = parseScheduledAt(String(req.body?.scheduledAt || ''));
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt debe ser una fecha ISO valida' });
    if (scheduledAt <= new Date()) return res.status(400).json({ error: 'No se puede reprogramar a una fecha pasada' });

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { user: { select: { id: true, email: true } } } },
        client: { select: { id: true, email: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    const isClient = appointment.clientId === userId;
    const isProfessional = appointment.professional.userId === userId;
    if (role !== 'ADMIN' && !isClient && !isProfessional) {
      return res.status(403).json({ error: 'No tienes permiso para reprogramar esta cita' });
    }
    if (!['REQUESTED', 'CONFIRMED', 'PENDING_PAYMENT', 'SCHEDULED'].includes(appointment.status)) {
      return res.status(400).json({ error: `No se puede reprogramar una cita en estado: ${appointment.status}` });
    }

    const availabilityCheck = await ensureMedicalSlotInsideAvailability(appointment.professionalId, scheduledAt, appointment.id);
    if (!availabilityCheck.ok) return res.status(availabilityCheck.status).json({ error: availabilityCheck.error });

    const nextStatus = isClient && role !== 'ADMIN' ? 'REQUESTED' : 'CONFIRMED';
    const currentMeta = parseAppointmentMeta(appointment.notes) || {};
    const updatedMeta: AppointmentMeta = {
      ...currentMeta,
      requestedScheduledAt: scheduledAt.toISOString(),
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        scheduledAt: nextStatus === 'CONFIRMED' ? scheduledAt : appointment.scheduledAt,
        status: nextStatus as any,
        notes: serializeAppointmentMeta(updatedMeta),
      },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: nextStatus === 'CONFIRMED' ? 'RESCHEDULED' : 'RESCHEDULE_REQUESTED',
      fromStatus: appointment.status,
      toStatus: nextStatus,
      metadata: { requestedScheduledAt: scheduledAt.toISOString(), previousScheduledAt: appointment.scheduledAt?.toISOString() || null },
    });

    res.json({ message: nextStatus === 'CONFIRMED' ? 'Cita reprogramada' : 'Solicitud de reprogramacion enviada', appointment: updated });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/events', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { professional: { select: { userId: true } } },
    });
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    if (role !== 'ADMIN' && appointment.clientId !== userId && appointment.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este historial' });
    }

    const events = await prisma.appointmentEvent.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/video-session', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { select: { id: true, userId: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (!canAccessAppointmentVideo(req.user, appointment)) {
      return res.status(403).json({ error: 'No tienes permiso para esta videollamada' });
    }
    if (!canUseVideoForStatus(appointment.status)) {
      return res.status(409).json({ error: 'La videollamada solo esta disponible en citas activas.' });
    }

    const currentMeta = parseAppointmentMeta(appointment.notes);
    const { nextMeta, videoSession, meetingLink } = upsertVideoSessionMeta(appointment.id, currentMeta, {
      meetingLinkRaw: req.body?.meetingLink,
      providerRaw: req.body?.provider,
      forceAuto: Boolean(req.body?.forceAuto),
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { notes: serializeAppointmentMeta(nextMeta) },
    });

    await logSecurityAuditEvent({
      action: 'appointment.video_session_upserted',
      actorUserId: req.user?.userId,
      appointmentId: appointment.id,
      metadata: { provider: videoSession.provider },
    });

    res.json({
      appointmentId: appointment.id,
      meetingLink,
      videoSession: {
        provider: videoSession.provider,
        embedAllowed: Boolean(videoSession.embedAllowed),
        joinUrl: videoSession.joinUrl || null,
        roomName: videoSession.roomName || null,
      },
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('link valido')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/:id/video-token', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { select: { id: true, userId: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (!canAccessAppointmentVideo(req.user, appointment)) {
      return res.status(403).json({ error: 'No tienes permiso para esta videollamada' });
    }
    if (!canUseVideoForStatus(appointment.status)) {
      return res.status(409).json({ error: 'La videollamada solo esta disponible en citas activas.' });
    }

    const signer = getVideoTokenSigner();
    if (!signer) {
      return res.status(503).json({ error: 'Configuracion de token no disponible' });
    }

    const currentMeta = parseAppointmentMeta(appointment.notes);
    const { nextMeta, videoSession } = upsertVideoSessionMeta(appointment.id, currentMeta, { forceAuto: false });
    if (!videoSession.joinUrl) {
      return res.status(409).json({ error: 'La cita no tiene link de videollamada configurado' });
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + VIDEO_TOKEN_TTL_SECONDS;
    const jti = randomUUID();
    const { algorithm } = signer;
    const token = jwt.sign(
      {
        type: 'video_join',
        appointmentId: appointment.id,
        userId: req.user.userId,
        role: req.user.role,
        provider: videoSession.provider,
        roomName: videoSession.roomName || null,
        joinUrl: videoSession.joinUrl,
      },
      signer.secret,
      { algorithm, expiresIn: VIDEO_TOKEN_TTL_SECONDS, jwtid: jti },
    );

    const nextVideoSession: AppointmentVideoSession = {
      ...videoSession,
      lastTokenIssuedAt: new Date(iat * 1000).toISOString(),
      lastTokenExpiresAt: new Date(exp * 1000).toISOString(),
      lastTokenIssuedTo: req.user.userId,
      updatedAt: new Date().toISOString(),
    };

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: ['CONFIRMED', 'SCHEDULED'].includes(appointment.status) ? 'IN_PROGRESS' : appointment.status,
        notes: serializeAppointmentMeta({
          ...nextMeta,
          videoSession: nextVideoSession,
        }),
      },
    });

    await logSecurityAuditEvent({
      action: 'appointment.video_token_issued',
      actorUserId: req.user?.userId,
      appointmentId: appointment.id,
      metadata: { provider: nextVideoSession.provider, expiresAt: new Date(exp * 1000).toISOString() },
    });

    res.json({
      token,
      provider: nextVideoSession.provider,
      roomName: nextVideoSession.roomName || null,
      joinUrl: nextVideoSession.joinUrl || null,
      embedAllowed: Boolean(nextVideoSession.embedAllowed),
      expiresAt: new Date(exp * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/video-opened', authenticate, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { token } = req.body || {};
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { select: { id: true, userId: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (!canAccessAppointmentVideo(req.user, appointment)) {
      return res.status(403).json({ error: 'No tienes permiso para esta videollamada' });
    }
    if (!canUseVideoForStatus(appointment.status)) {
      return res.status(409).json({ error: 'La videollamada solo esta disponible en citas activas.' });
    }

    if (token) {
      const signer = getVideoTokenSigner();
      if (!signer) {
        return res.status(503).json({ error: 'Configuracion de token no disponible' });
      }
      let decoded: any;
      try {
        decoded = jwt.verify(String(token), signer.secret, { algorithms: [signer.algorithm] }) as any;
      } catch {
        return res.status(401).json({ error: 'Token de videollamada invalido o expirado' });
      }
      if (decoded?.type !== 'video_join' || decoded?.appointmentId !== appointment.id || decoded?.userId !== req.user.userId) {
        return res.status(401).json({ error: 'Token de videollamada invalido' });
      }
    }

    const currentMeta = parseAppointmentMeta(appointment.notes);
    const { nextMeta, videoSession } = upsertVideoSessionMeta(appointment.id, currentMeta, { forceAuto: false });
    const nextVideoSession: AppointmentVideoSession = {
      ...videoSession,
      lastOpenedAt: new Date().toISOString(),
      lastOpenedBy: req.user.userId,
      updatedAt: new Date().toISOString(),
    };

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        notes: serializeAppointmentMeta({
          ...nextMeta,
          videoSession: nextVideoSession,
        }),
      },
    });

    await logSecurityAuditEvent({
      action: 'appointment.video_opened',
      actorUserId: req.user?.userId,
      appointmentId: appointment.id,
      metadata: { openedBy: req.user?.userId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/complete', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { user: { select: { id: true, email: true } } } },
        client: { select: { id: true, email: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const canComplete = role === 'ADMIN' || appointment.professional.userId === userId;
    if (!canComplete) {
      return res.status(403).json({ error: 'No tienes permiso para completar esta cita' });
    }
    if (!['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(appointment.status)) {
      return res.status(400).json({ error: `Solo se puede completar una cita activa. Estado actual: ${appointment.status}` });
    }

    const currentMeta = parseAppointmentMeta(appointment.notes) || {};
    const updatedMeta: AppointmentMeta = {
      ...currentMeta,
      payment: {
        ...(currentMeta.payment || {}),
        status: 'PAID_RELEASED',
        releasedAt: new Date().toISOString(),
      },
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'COMPLETED',
        notes: serializeAppointmentMeta(updatedMeta),
      },
    });

    await logSecurityAuditEvent({
      action: 'appointment.completed',
      actorUserId: userId,
      appointmentId: appointment.id,
      targetUserId: appointment.clientId,
      metadata: { paymentStatus: 'PAID_RELEASED' },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: 'COMPLETED',
      fromStatus: appointment.status,
      toStatus: 'COMPLETED',
      metadata: { paymentStatus: 'PAID_RELEASED' },
    });

    res.json({ message: 'Cita completada y fondos liberados', appointment: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/no-show', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: { include: { user: { select: { id: true, email: true } } } },
        client: { select: { id: true, email: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const canMarkNoShow = role === 'ADMIN' || appointment.professional.userId === userId;
    if (!canMarkNoShow) {
      return res.status(403).json({ error: 'No tienes permiso para marcar no-show' });
    }
    if (!['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(appointment.status)) {
      return res.status(400).json({ error: `No se puede marcar no-show desde estado ${appointment.status}` });
    }

    const currentMeta = parseAppointmentMeta(appointment.notes) || {};
    const updatedMeta: AppointmentMeta = {
      ...currentMeta,
      payment: {
        ...(currentMeta.payment || {}),
        status: 'NO_SHOW_HOLD',
        noShowMarkedAt: new Date().toISOString(),
      },
    };

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: 'NO_SHOW',
        notes: serializeAppointmentMeta(updatedMeta),
      },
    });

    await logSecurityAuditEvent({
      action: 'appointment.no_show_marked',
      actorUserId: userId,
      appointmentId: appointment.id,
      targetUserId: appointment.clientId,
      metadata: { paymentStatus: 'NO_SHOW_HOLD' },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: 'NO_SHOW',
      fromStatus: appointment.status,
      toStatus: 'NO_SHOW',
      metadata: { paymentStatus: 'NO_SHOW_HOLD' },
    });

    res.json({ message: 'Cita marcada como no-show. Fondos retenidos para revision.', appointment: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancel', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const isClient = appointment.clientId === userId;
    const isProfessional = appointment.professional.userId === userId;

    if (role !== 'ADMIN' && !isClient && !isProfessional) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita' });
    }

    if (!['REQUESTED', 'CONFIRMED', 'SCHEDULED', 'PENDING_PAYMENT'].includes(appointment.status)) {
      return res.status(400).json({
        error: `No se puede cancelar una cita en estado: ${appointment.status}`,
      });
    }

    const meta = parseAppointmentMeta(appointment.notes);
    const requestedAt = parseRequestedSlotFromMeta(meta);
    const referenceDate = appointment.scheduledAt || requestedAt;
    const cancellationPolicy = evaluateCancellationPolicy(referenceDate);
    const updatedMeta = serializeAppointmentMeta({
      ...(meta || {}),
      cancellationPolicy,
    });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', notes: updatedMeta },
    });

    if (isClient && appointment.professional.user) {
      notifyUser({
        userId: appointment.professional.userId,
        type: 'ORDER_STATUS',
        title: 'Cita cancelada',
        body: `El cliente cancelo la cita del ${referenceDate ? referenceDate.toLocaleDateString('es-MX') : 'fecha no disponible'}`,
        metadata: { appointmentId: id },
        email: appointment.professional.user.email,
        emailSubject: 'Cita cancelada - Intecnia',
        emailHtml: '<p>El cliente ha cancelado la cita agendada. Puedes revisar tu agenda en el dashboard.</p>',
      }).catch((error) => logger.error({ err: error, appointmentId: id }, 'Error notificando cancelacion al profesional'));
    }

    if (isProfessional && appointment.client) {
      notifyUser({
        userId: appointment.client.id,
        type: 'ORDER_STATUS',
        title: 'Cita cancelada por el profesional',
        body: `El profesional cancelo la cita del ${referenceDate ? referenceDate.toLocaleDateString('es-MX') : 'fecha no disponible'}`,
        metadata: { appointmentId: id },
        email: appointment.client.email,
        emailSubject: 'Tu cita fue cancelada - Intecnia',
        emailHtml: '<p>El profesional ha cancelado tu cita. Te recomendamos agendar un nuevo horario.</p>',
      }).catch((error) => logger.error({ err: error, appointmentId: id }, 'Error notificando cancelacion al cliente'));
    }

    await logSecurityAuditEvent({
      action: 'appointment.cancelled',
      actorUserId: userId,
      appointmentId: appointment.id,
      targetUserId: isClient ? appointment.professional.userId : appointment.clientId,
      metadata: { previousStatus: appointment.status, cancellationPolicy },
    });

    await recordAppointmentEvent({
      appointmentId: appointment.id,
      actorUserId: userId,
      type: 'CANCELLED',
      fromStatus: appointment.status,
      toStatus: 'CANCELLED',
      metadata: { cancellationPolicy },
    });

    res.json({ message: 'Cita cancelada con exito', appointment: updated });
  } catch (error) {
    next(error);
  }
});

export { router as appointmentsRouter };
