import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

dotenv.config();

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Get Professional Profile
 * GET /api/professionals/:id
 */
app.get('/api/professionals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscamos al profesional y traemos sus datos de usuario asociados
    const professional = await prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    const user = await prisma.user.findUnique({
      where: { id: professional.userId }
    });

    // Construimos la respuesta que espera el frontend
    res.json({
      id: professional.id,
      name: user?.name || 'Profesional Certificado',
      avatarUrl: user?.avatarUrl,
      title: professional.title,
      bio: professional.bio,
      isVerified: professional.isVerified,
      biometricDone: professional.biometricDone,
      satVerifiedAt: professional.satVerifiedAt,
      yearsExp: '10+', // Esto podría ser una lógica basada en createdAt
      projectsCount: '25+', 
      successRate: '98%',
      rating: '4.9'
    });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * AI Chat Endpoint (OpenAI fallback for professionals without VISO)
 * POST /api/chat
 * Body: { message, professional, history? }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, professional, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El campo message es requerido' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI no configurado en el servidor' });
    }

    // System prompt adaptado al profesional
    const systemPrompt = `Eres el asistente virtual de ${professional || 'un profesional'} en KonectIA, 
la plataforma líder de servicios profesionales en México.

Tu misión:
- Responder preguntas sobre los servicios del profesional de forma clara y concisa
- Ayudar al usuario a agendar una consulta o cita
- Ser cálido, profesional y usar español mexicano natural
- Nunca inventar precios o información que no conozcas; di que el profesional confirmará los detalles

Si el usuario quiere agendar, pide su nombre y número de teléfono o correo para que el profesional le contacte.
Mantén respuestas cortas (máximo 3 oraciones). No uses markdown con asteriscos.`;

    // Construir historial de conversación para contexto
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
        model: 'gpt-4o-mini', // Modelo económico y rápido
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: message },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI error:', errText);
      return res.status(502).json({ error: 'Error al contactar OpenAI' });
    }

    const data = await openaiResponse.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();

    res.json({ output: reply || 'En este momento no puedo responder. Por favor intenta de nuevo.' });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(port, () => {
  console.log(`🚀 KonectIA Backend running at http://localhost:${port}`);
});
