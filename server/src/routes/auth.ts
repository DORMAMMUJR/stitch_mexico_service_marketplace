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
          title: '', // Default vacío
          category: 'GENERAL_MAINTENANCE', // Requerido por schema
          currency: 'MXN',
        },
      });
    }

    // Enviar email de bienvenida asíncronamente (sin bloquear la respuesta)
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

    // Configurar cookie HttpOnly segura
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 día en milisegundos
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

// Endpoint: POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// Endpoint: GET /api/auth/me — Devuelve el usuario autenticado a partir de la cookie
router.get('/me', (req, res) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const key = (env.JWT_PUBLIC_KEY || env.JWT_PRIVATE_KEY || 'secret_fallback_key') as string;
    const algorithms = key.includes('BEGIN') ? ['RS256'] : ['HS256'];
    const payload = jwt.verify(token, key, { algorithms: algorithms as any }) as any;

    // Buscar usuario con datos frescos; incluir perfil profesional si aplica
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
          take: 1, // Solo necesitamos saber si hay al menos una
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

        // Determinar si el perfil profesional está completo
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
            // Solo presente para PROFESSIONAL; undefined para otros roles
            profileComplete,
          },
        });
      })
      .catch(() => res.status(500).json({ error: 'Error interno' }));
  } catch (err) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// Endpoint: POST /api/auth/reset-password-request
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

    // Generar un token de reseteo temporal
    const resetToken = jwt.sign(
      { userId: user.id, intent: 'reset_password' },
      env.JWT_PRIVATE_KEY || 'secret_fallback_key',
      { expiresIn: '15m' }
    );

    // Enviar correo real usando Resend
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

// Endpoint: POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar el token
    const key = (env.JWT_PRIVATE_KEY || 'secret_fallback_key') as string;
    let payload;
    try {
      payload = jwt.verify(token, key) as any;
    } catch (err) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    if (payload.intent !== 'reset_password' || !payload.userId) {
      return res.status(400).json({ error: 'Token no válido para esta operación' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña en la base de datos
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
