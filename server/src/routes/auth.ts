import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/db';
import { env } from '../config/env';

const router = Router();

// ─── Rate Limiters ───────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // 10 intentos por ventana
  message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                    // 5 registros por ventana
  message: { error: 'Demasiados intentos de registro. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Endpoint: POST /api/auth/register
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: userRole,
      },
    });

    if (userRole === 'PROFESSIONAL') {
      await prisma.professional.create({
        data: {
          userId: user.id,
          title: 'Nuevo Profesional', // Default
          category: 'GENERAL_MAINTENANCE', // Default
          currency: 'MXN',
        },
      });
    }

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: user.id });
  } catch (error: any) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint: POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const privateKey = env.JWT_PRIVATE_KEY || 'secret_fallback_key';
    const algorithm = env.JWT_PRIVATE_KEY && env.JWT_PRIVATE_KEY.includes('BEGIN') ? 'RS256' : 'HS256';

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      privateKey,
      { algorithm: algorithm as any, expiresIn: env.JWT_ACCESS_EXPIRY || '1d' } as any
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    });
  } catch (error: any) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as authRouter };
