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
import { stripe } from './lib/stripe';
import { prisma } from './lib/db';
import { EscrowStateMachine } from './lib/escrow';
import { authenticate } from './middleware/auth';
import { sendEmail, emailTemplates } from './lib/email';
import { startEscrowCron } from './jobs/escrowCron';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// ✅ AGREGAR AQUÍ — antes de cualquier otro middleware
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar CSP por ahora si sirves el frontend desde aquí
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(pinoHttp({ logger }));



// ─── CORS ────────────────────────────────────────────────────────────────────
import { env } from './config/env';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  // Agregar dominios de producción desde .env
  ...(env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin === o)) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));

// ─── Stripe Webhook (Debe ir ANTES de express.json) ──────────────────────────
// Stripe necesita el raw body para verificar la firma criptográfica
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Falta firma o secreto de webhook');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`❌ Error de firma de Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      // Asumimos que al crear el PaymentIntent, guardaste el orderId en metadata
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        console.log(`💰 Pago completado para la orden: ${orderId}. Cambiando estado a FONDOS_EN_ESCROW...`);
        await EscrowStateMachine.transition(orderId, 'FONDOS_EN_ESCROW', {
          stripePaymentIntentId: paymentIntent.id
        });
      } else {
        console.warn('⚠️ PaymentIntent succeeded pero no tiene orderId en metadata.');
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Error procesando el evento de Stripe:', err);
    res.status(500).end();
  }
});

// ─── Middleware Global JSON ──────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ─── Multer Config se ha movido a src/lib/upload.ts ────────────────────────

// ─── Routers ─────────────────────────────────────────────────────────────────
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { appointmentsRouter } from './routes/appointments';
import { professionalsRouter } from './routes/professionals';
import { ordersRouter } from './routes/orders';
import { messagesRouter } from './routes/messages';
import { adminRouter } from './routes/admin';
import { uploadDoc } from './lib/upload';

// ─── Servir archivos subidos localmente ──────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/professionals', professionalsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/verification', adminRouter); // Para el upload de docs

// ─── Servir el build del frontend React ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../public');
app.use(express.static(frontendDist));

// ─── Healthcheck ─────────────────────────────────────────────────────────────
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
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minuto
  max: 20,                    // 20 mensajes por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes enviados. Por favor espera un momento antes de continuar.' },
});
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { message, professional, history = [], clientId, professionalId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El campo message es requerido' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI no configurado en el servidor' });
    }

    const systemPrompt = `Eres el asistente virtual de ${professional || 'un profesional'} en Intecnia, 
el portal corporativo líder de servicios y proveedores en México.

Tu misión:
- Responder preguntas sobre los servicios del profesional de forma clara y concisa
- Ayudar al usuario a agendar una consulta o cita
- Ser cálido, profesional y usar español mexicano natural
- NUNCA inventes precios.
- Si el usuario solicita agendar una cita, pídele la FECHA y HORA específica, y el MOTIVO. Cuando te dé esos datos, usa la herramienta book_appointment para agendarla en la base de datos.
Mantén respuestas cortas.`;

    const chatHistory = history.slice(-6).map((m: { sender: string; text: string }) => ({
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
          { role: 'user', content: message },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "book_appointment",
              description: "Agenda una cita real con el profesional. Usa esto solo cuando tengas fecha, hora y motivo.",
              parameters: {
                type: "object",
                properties: {
                  "date": { "type": "string", "description": "Fecha y hora ISO 8601" },
                  "notes": { "type": "string", "description": "Motivo de la cita" }
                },
                "required": ["date"]
              }
            }
          }
        ],
        tool_choice: "auto",
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI error:', errText);
      return res.status(502).json({ error: 'Error al contactar OpenAI' });
    }

    const data = await openaiResponse.json() as any;
    const responseMessage = data.choices?.[0]?.message;

    // Handle Tool Call
    if (responseMessage?.tool_calls) {
      const toolCall = responseMessage.tool_calls[0];
      if (toolCall.function.name === 'book_appointment') {
        const args = JSON.parse(toolCall.function.arguments);
        
        if (!clientId || !professionalId) {
           return res.json({ output: 'Por favor, inicia sesión en tu cuenta para poder agendar una cita real en mi calendario.' });
        }

        const appointment = await prisma.appointment.create({
           data: {
             clientId,
             professionalId,
             date: new Date(args.date).toISOString(),
             notes: args.notes,
           }
        });

        return res.json({ output: `¡Perfecto! He agendado tu cita para el ${new Date(args.date).toLocaleString()}. ¡Te esperamos!` });
      }
    }

    const reply = responseMessage?.content?.trim();
    res.json({ output: reply || 'En este momento no puedo responder. Por favor intenta de nuevo.' });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── SPA Fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

import { globalErrorHandler } from './middleware/errorHandler';

Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Intecnia corriendo en http://localhost:${port}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
  console.log(`   Frontend: ${frontendDist}`);
  console.log(`   ORM: Prisma Client (producción)`);

  // ✅ AGREGAR AQUÍ:
  startEscrowCron();
});
