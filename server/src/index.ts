import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import Stripe from 'stripe';
import { prisma } from './lib/db';
import { EscrowStateMachine } from './lib/escrow'; // Asumiendo que está exportado así

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

// ─── Multer Config se ha movido a src/lib/upload.ts ────────────────────────

// ─── Routers ─────────────────────────────────────────────────────────────────
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { appointmentsRouter } from './routes/appointments';
import { professionalsRouter } from './routes/professionals';
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
 * Get Professional Profile
 * GET /api/professionals/:id
 */
app.get('/api/professionals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.query.clientId as string | undefined;

    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        user: true,
        reviews: true,
        orders: true,
      },
    });

    if (!professional) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    const completedOrders = professional.orders.filter((o: any) => o.status === 'COMPLETADO');
    const totalNonDraftOrders = professional.orders.filter(
      (o: any) => !['DRAFT', 'CANCELADO'].includes(o.status)
    );

    const totalReviews = professional.reviews.length;
    const avgRating = totalReviews > 0
      ? professional.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews
      : 5.0;

    const yearsActive = Math.max(
      1,
      Math.floor((Date.now() - professional.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
    );

    const successRate = totalNonDraftOrders.length > 0
      ? Math.round((completedOrders.length / totalNonDraftOrders.length) * 100)
      : 98;

    let phoneVisible: string | null = null;
    if (clientId) {
      const escrowOrder = await prisma.order.findFirst({
        where: {
          professionalId: id,
          clientId,
          status: {
            in: ['FONDOS_EN_ESCROW', 'EN_PROGRESO', 'COMPLETADO', 'PAYOUT_INICIADO', 'PAYOUT_COMPLETADO'],
          },
        },
      });
      if (escrowOrder) {
        phoneVisible = professional.user?.phone || null;
      }
    }

    res.json({
      id: professional.id,
      name: professional.user?.name || 'Profesional Certificado',
      phone: phoneVisible,
      avatarUrl: professional.user?.avatarUrl,
      title: professional.title,
      bio: professional.bio,
      isVerified: professional.isVerified,
      biometricDone: professional.biometricDone,
      satVerifiedAt: professional.satVerifiedAt,
      yearsExp: `${yearsActive}+`,
      projectsCount: `${completedOrders.length}`,
      successRate: `${successRate}%`,
      rating: avgRating.toFixed(1),
      reviewCount: totalReviews,
    });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Get Reviews for a Professional
 */
app.get('/api/professionals/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
      where: { professionalId: id },
      include: {
        author: {
          select: { name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      name: r.author.name,
      avatarUrl: r.author.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
 * Admin Panel: Approve Verification Document
 * PATCH /api/admin/verifications/:id/approve
 */
app.patch('/api/admin/verifications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body; // En prod, vendría del req.user JWT validado

    // Iniciar transacción atómica
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Aprobar el documento
      const doc = await tx.verificationDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId || 'admin-system',
          reviewedAt: new Date(),
        },
      });

      // 2. Verificar si el profesional ya cumple con todo (ej: tiene SAT_CONSTANCIA aprobada)
      // En un flujo real, revisarías todos los docs obligatorios. Por ahora, si se aprueba el SAT, se verifica.
      if (doc.type === 'SAT_CONSTANCIA') {
        await tx.professional.update({
          where: { id: doc.professionalId },
          data: {
            isVerified: true,
            verificationStatus: 'APPROVED',
            satVerifiedAt: new Date(),
          },
        });
      }

      return doc;
    });

    res.json({ message: 'Documento aprobado exitosamente', document: result });
  } catch (error) {
    console.error('Error approving document:', error);
    res.status(500).json({ error: 'Error interno al aprobar documento' });
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

app.listen(port, () => {
  console.log(`🚀 Intecnia corriendo en http://localhost:${port}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
  console.log(`   Frontend: ${frontendDist}`);
  console.log(`   ORM: Prisma Client (producción)`);
});
