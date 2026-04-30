import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import { prisma } from './lib/db';
import { EscrowStateMachine } from './lib/escrow'; // Asumiendo que está exportado así
import { authenticate } from './middleware/auth';
import { sendEmail, emailTemplates } from './lib/email';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3000;

// ─── Stripe Config ───────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia', // Usa la versión requerida por la SDK instalada
});

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('seenode.com')) {
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

// ─── Servir el build del frontend React ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../public');
app.use(express.static(frontendDist));

// ─── Healthcheck ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const result: any[] = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ status: 'ok', env: process.env.NODE_ENV, db: result[0]?.now });
  } catch (err) {
    res.json({ status: 'ok', env: process.env.NODE_ENV, db: 'no conectada' });
  }
});



/**
 * Upload Verification Document
 */
app.post('/api/verification/upload', uploadDoc.single('constancia'), async (req, res) => {
  try {
    const { professionalId, docType } = req.body;
    const file = (req as any).file; // Castear a any por diferencias entre multer y multerS3 types

    if (!file) {
      return res.status(400).json({ error: 'No se cargó ningún archivo' });
    }

    if (!professionalId || !docType) {
      return res.status(400).json({ error: 'professionalId y docType son requeridos' });
    }

    const validDocTypes = ['INE', 'PASSPORT', 'SAT_CONSTANCIA', 'CONOCER_CERT', 'COMPROBANTE_DOMICILIO'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `docType inválido. Válidos: ${validDocTypes.join(', ')}` });
    }

    // Si es S3 usará file.location, si es local usará file.filename
    const fileUrl = file.location || `/uploads/${file.filename}`;

    const document = await prisma.verificationDocument.create({
      data: {
        professionalId,
        type: docType as any,
        fileUrl: fileUrl,
        status: 'PENDING',
      },
    });

    res.json({
      id: document.id,
      fileUrl: document.fileUrl,
      status: document.status,
      message: 'Documento subido exitosamente. Pendiente de revisión.',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});


/**
 * Admin Panel: Get Pending Verifications
 * GET /api/admin/verifications/pending
 */
app.get('/api/admin/verifications/pending', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const pendingDocs = await prisma.verificationDocument.findMany({
      where: { status: 'PENDING' },
      include: {
        professional: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingDocs);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Admin Panel: Approve Verification Document
 * PATCH /api/admin/verifications/:id/approve
 */
// FIX: Middleware authenticate añadido
app.patch('/api/admin/verifications/:id/approve', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // FIX: Validación estricta de Rol
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const adminId = user.userId; 

    const result = await prisma.$transaction(async (tx: any) => {
      const doc = await tx.verificationDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      if (doc.type === 'SAT_CONSTANCIA') {
        const updatedProf = await tx.professional.update({
          where: { id: doc.professionalId },
          data: { isVerified: true, verificationStatus: 'APPROVED', satVerifiedAt: new Date() },
          include: { user: true }
        });

        // Notificar al profesional asincrónicamente
        sendEmail({
          to: updatedProf.user.email,
          subject: '¡Verificación Aprobada! - Intecnia',
          html: emailTemplates.verificationApproved(updatedProf.user.name)
        }).catch(console.error);
      }
      return doc;
    });

    res.json({ message: 'Documento aprobado exitosamente', document: result });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al aprobar documento' });
  }
});

/**
 * Admin Panel: Reject Verification Document
 * PATCH /api/admin/verifications/:id/reject
 */
app.patch('/api/admin/verifications/:id/reject', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const adminId = user.userId;

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });
    }

    const doc = await prisma.verificationDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        professional: {
          include: { user: true }
        }
      }
    });

    // Notificar al profesional con el motivo
    sendEmail({
      to: doc.professional.user.email,
      subject: 'Actualizacion requerida en tu Verificacion - Intecnia',
      html: emailTemplates.verificationRejected(doc.professional.user.name, reason.trim())
    }).catch(console.error);

    res.json({ message: 'Documento rechazado. Se notificara al profesional.', document: doc });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ error: 'Error interno al rechazar documento' });
  }
});


/**
 * AI Chat Endpoint (OpenAI fallback)
 */
app.post('/api/chat', async (req, res) => {
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
             date: new Date(args.date),
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

// ─── Automatización: Liberación de Fondos en Escrow (72 hrs) ────────────────
setInterval(() => {
  console.log('⏳ Ejecutando revisión de Escrow Automático...');
  EscrowStateMachine.processAutoReleases()
    .then(() => console.log('✅ Revisión de Escrow completada.'))
    .catch(err => console.error('❌ Error en cron de Escrow:', err));
}, 60 * 60 * 1000); // Se ejecuta cada hora (1 hora en milisegundos)

app.listen(port, () => {
  console.log(`🚀 Intecnia corriendo en http://localhost:${port}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
  console.log(`   Frontend: ${frontendDist}`);
  console.log(`   ORM: Prisma Client (producción)`);
});
