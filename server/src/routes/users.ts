import { Router } from 'express';
import { prisma } from '../lib/db';
import { uploadPublicImage } from '../lib/upload';
import { authenticate } from '../middleware/auth';

const router = Router();

// Endpoint: POST /api/users/avatar
// Solo usuarios autenticados pueden subir su propio avatar
router.post('/avatar', authenticate, uploadPublicImage.single('avatar'), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const file = req.file as any;

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No se cargó ningún archivo de imagen' });
    }

    // S3 usa file.location, DiskStorage usa file.filename
    const fileUrl = file.location || `/uploads/${file.filename}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl },
    });

    res.json({
      message: 'Avatar actualizado exitosamente',
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    next(error);
  }
});

// Endpoint: GET /api/users/me/notifications
// Obtener notificaciones del usuario autenticado
router.get('/me/notifications', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const limit = Math.min(Number(req.query.limit || 20), 50);
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

router.put('/me', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').trim();

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nombre completo y teléfono son obligatorios' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name, phone },
      select: { id: true, name: true, phone: true, email: true, role: true, avatarUrl: true },
    });

    res.json({ user: updated, message: 'Perfil actualizado' });
  } catch (error) {
    next(error);
  }
});

router.patch('/me/notifications/read-all', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    res.json({ message: 'Notificaciones marcadas como leídas' });
  } catch (error) {
    next(error);
  }
});

export { router as usersRouter };
