import { Router } from 'express';
import { prisma } from '../lib/db';
import { uploadImage } from '../lib/upload';
import { authenticate } from '../middleware/auth';

const router = Router();

// Endpoint: POST /api/users/avatar
// Solo usuarios autenticados pueden subir su propio avatar
router.post('/avatar', authenticate, uploadImage.single('avatar'), async (req: any, res: any) => {
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
  } catch (error: any) {
    console.error('Error in /avatar:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar avatar' });
  }
});

// Endpoint: GET /api/users/me/notifications
// Obtener notificaciones del usuario autenticado
router.get('/me/notifications', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limitar a las 20 más recientes por ahora
    });

    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

export { router as usersRouter };
