import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/db';
import { env } from '../config/env';
import { sendEmail, emailTemplates } from '../lib/email';
import { logger } from '../lib/logger';

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
  if (!env.JWT_PRIVATE_KEY) {
    throw new Error('JWT_PRIVATE_KEY no está configurada');
  }
  return env.JWT_PRIVATE_KEY;
}

function getJwtAlgorithm(key: string): 'RS256' | 'HS256' {
  return key.includes('BEGIN') ? 'RS256' : 'HS256';
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { email, password, name, phone, role, guest_id, acceptedTerms, acceptedPrivacy, privacyConsentedAt } = req.body;

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const fullName = String(name || '').trim();
    const phoneValue = String(phone || '').trim();
    const passwordValue = String(password || '');

    if (!normalizedEmail || !passwordValue || !fullName || !phoneValue) {
      return res.status(400).json({ error: 'Correo, teléfono, nombre completo y contraseña son obligatorios' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Ingresa un correo electrónico válido' });
    }

    if (passwordValue.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      return res.status(400).json({ error: 'Debes aceptar términos y aviso de privacidad para crear la cuenta' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    const passwordHash = await bcrypt.hash(passwordValue, 10);
    const userRole = role === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'CLIENT';
    const parsedPrivacyConsentedAt = privacyConsentedAt ? new Date(privacyConsentedAt) : new Date();

    if (Number.isNaN(parsedPrivacyConsentedAt.getTime())) {
      return res.status(400).json({ error: 'privacyConsentedAt debe ser una fecha válida' });
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: fullName,
        phone: phoneValue,
        role: userRole,
        termsConsentedAt: new Date(),
        privacyConsentedAt: parsedPrivacyConsentedAt,
      },
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
      // Validar formato para evitar asociación maliciosa
      const guestIdRegex = /^guest_\d+$/;
      if (guestIdRegex.test(guest_id)) {
        // Solo asociar citas que realmente sean de este guest y no tengan dueño
        await prisma.appointment.updateMany({
          where: {
            guestId: guest_id,
            clientId: null,       // Solo citas sin dueño asignado
          },
          data: { clientId: user.id },
        });
      }
      // Si el formato no es válido, continuar sin error —
      // el registro del usuario ya se completó correctamente
    }

    sendEmail({
      to: normalizedEmail,
      subject: `Bienvenido a Intecnia, ${fullName}`,
      html: emailTemplates.welcome(fullName, userRole)
    }).catch((error) => {
      logger.error({ err: error, email: normalizedEmail }, 'No se pudo enviar correo de bienvenida');
    });

    res.status(201).json({ message: 'Usuario creado exitosamente', userId: user.id });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
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

    const accessExpiry = '7d';
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
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    });
  } catch (error) {
    next(error);
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
router.get('/me', (req, res, next) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const key = (env.JWT_PUBLIC_KEY || env.JWT_PRIVATE_KEY) as string | undefined;
    if (!key) {
      return res.status(500).json({ error: 'Configuración JWT incompleta en el servidor' });
    }
    const algorithms = key.includes('BEGIN') ? ['RS256'] : ['HS256'];
    const payload = jwt.verify(token, key, { algorithms: algorithms as any }) as any;

    prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
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
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
            hasUnreadNotifications: user.notifications.length > 0,
            profileComplete,
          },
        });
      })
      .catch(next);
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// ─── POST /api/auth/reset-password-request ────────────────────────────────────
router.post('/reset-password-request', async (req, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
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
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };
