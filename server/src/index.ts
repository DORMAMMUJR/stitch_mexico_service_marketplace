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

app.listen(port, () => {
  console.log(`🚀 KonectIA Backend running at http://localhost:${port}`);
});
