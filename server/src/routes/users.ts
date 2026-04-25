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

export { router as usersRouter };
