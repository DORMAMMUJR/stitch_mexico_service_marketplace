import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/db';
import { env } from '../config/env';
import { sendEmail, emailTemplates } from '../lib/email';

const router = Router();

// ─── Rate Limiters ───────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de registro. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getJwtKey() {
  return env.JWT_PRIVATE_KEY || 'secret_fallback_key';
}

function getJwtAlgorithm(key: string): 'RS256' | 'HS256' {
  return key.includes('BEGIN') ? 'RS256' : 'HS256';
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, name, role, guest_id } = req.body;

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
      data: { email, passwordHash, name, role: userRole },
    });

    if (userRole === 'PROFESSIONAL') {
      await prisma.professional.create({
        data: {
          userId: user.id,
          title: '',
          category: 'GENERAL_MAINTENANCE',
          currency: 'MXN',
        },
      });
    }

    if (guest_id) {
      await prisma.appointment.updateMany({
        where: { guestId: guest_id },
        data: { clientId: user.id }
      });
    }

    sendEmail({
      to: email,
      subject: `¡Bienvenido a Intecnia, ${name}!`,
      html: emailTemplates.welcome(name, userRole)
    }).catch(console.error);

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: user.id });
  } catch (error: any) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
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

    const privateKey = getJwtKey();
    const algorithm = getJwtAlgorithm(privateKey);

    // FIX: Usar JWT_ACCESS_EXPIRY del env en lugar de hardcodear '7d'
    // El token y la cookie deben tener la misma duración.
    // JWT_ACCESS_EXPIRY default es '15m' pero para sesiones de usuario
    // usamos 7d como fallback explícito si el env no se cambió del default.
    const accessExpiry = env.JWT_ACCESS_EXPIRY === '15m' ? '7d' : env.JWT_ACCESS_EXPIRY;
    const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

    const token = jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      privateKey,
      { algorithm: algorithm as any, expiresIn: accessExpiry } as any
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    });

    res.json({
      message: 'Login exitoso',
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

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const key = (env.JWT_PUBLIC_KEY || env.JWT_PRIVATE_KEY || 'secret_fallback_key') as string;
    const algorithms = key.includes('BEGIN') ? ['RS256'] : ['HS256'];
    const payload = jwt.verify(token, key, { algorithms: algorithms as any }) as any;

    prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        notifications: {
          where: { read: false },
          select: { id: true },
          take: 1,
        },
        professional: {
          select: {
            title: true,
            bio: true,
            hourlyRate: true,
          },
        },
      },
    })
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        let profileComplete: boolean | undefined = undefined;
        if (user.role === 'PROFESSIONAL' && user.professional) {
          const { title, bio, hourlyRate } = user.professional;
          profileComplete =
            !!title &&
            title.trim() !== '' &&
            !!bio &&
            bio.trim() !== '' &&
            hourlyRate != null;
        }

        res.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            hasUnreadNotifications: user.notifications.length > 0,
            profileComplete,
          },
        });
      })
      .catch(() => res.status(500).json({ error: 'Error interno' }));
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// ─── POST /api/auth/reset-password-request ────────────────────────────────────
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Por seguridad, no revelamos si el correo existe o no
      return res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
    }

    const privateKey = getJwtKey();

    // FIX: Incluir email y un salt en el payload del token de reset.
    // Esto ata el token al usuario específico y previene reutilización
    // de tokens de sesión como tokens de reset.
    const resetToken = jwt.sign(
      {
        userId: user.id,
        email: user.email, // FIX: atar al email específico
        intent: 'reset_password',
      },
      privateKey,
      { expiresIn: '15m' }
    );

    await sendEmail({
      to: email,
      subject: 'Recuperación de Contraseña - Intecnia',
      html: emailTemplates.resetPassword(resetToken)
    });

    res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
  } catch (error: any) {
    console.error('Error in /reset-password-request:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const key = getJwtKey();
    let payload: any;
    try {
      payload = jwt.verify(token, key) as any;
    } catch (err) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // FIX: Validar intent Y email para prevenir uso de tokens de sesión como reset tokens
    if (payload.intent !== 'reset_password' || !payload.userId || !payload.email) {
      return res.status(400).json({ error: 'Token no válido para esta operación' });
    }

    // FIX: Verificar que el email del token coincide con el usuario en BD
    // Esto invalida el token si el email del usuario cambió desde que se emitió
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.email !== payload.email) {
      return res.status(400).json({ error: 'Token no válido o usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
  } catch (error: any) {
    console.error('Error in /reset-password:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as authRouter };
