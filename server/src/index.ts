import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Conexión directa a PostgreSQL (Seenode)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
const port = process.env.PORT || 3000;

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
app.use(express.json());

// ─── Servir el build del frontend React ──────────────────────────────────────
const frontendDist = path.join(__dirname, '../../app/dist');
app.use(express.static(frontendDist));

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', env: process.env.NODE_ENV, db: result.rows[0].now });
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

    const profResult = await pool.query(
      'SELECT * FROM "Professional" WHERE id = $1',
      [id]
    );

    if (profResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    const professional = profResult.rows[0];

    const userResult = await pool.query(
      'SELECT * FROM "User" WHERE id = $1',
      [professional.userId]
    );
    const user = userResult.rows[0];

    res.json({
      id: professional.id,
      name: user?.name || 'Profesional Certificado',
      avatarUrl: user?.avatarUrl,
      title: professional.title,
      bio: professional.bio,
      isVerified: professional.isVerified,
      biometricDone: professional.biometricDone,
      satVerifiedAt: professional.satVerifiedAt,
      yearsExp: '10+',
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
 * AI Chat Endpoint (OpenAI fallback)
 * POST /api/chat
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

    const systemPrompt = `Eres el asistente virtual de ${professional || 'un profesional'} en KonectIA, 
la plataforma líder de servicios profesionales en México.

Tu misión:
- Responder preguntas sobre los servicios del profesional de forma clara y concisa
- Ayudar al usuario a agendar una consulta o cita
- Ser cálido, profesional y usar español mexicano natural
- Nunca inventar precios o información que no conozcas; di que el profesional confirmará los detalles

Si el usuario quiere agendar, pide su nombre y número de teléfono o correo para que el profesional le contacte.
Mantén respuestas cortas (máximo 3 oraciones). No uses markdown con asteriscos.`;

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

// ─── SPA Fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 KonectIA corriendo en http://localhost:${port}`);
  console.log(`   ENV: ${process.env.NODE_ENV}`);
  console.log(`   Frontend: ${frontendDist}`);
});
