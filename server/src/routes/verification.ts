import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { uploadPrivateDoc } from '../lib/upload';

const router = Router();

// POST /api/verification/upload
router.post('/upload', authenticate, uploadPrivateDoc.single('constancia'), async (req: any, res, next) => {
  try {
    const { professionalId, docType } = req.body;
    const file = req.file;
    const requesterUserId = req.user?.userId;
    const requesterRole = String(req.user?.role || '').toUpperCase();

    if (!file) {
      return res.status(400).json({ error: 'No se cargo ningun archivo' });
    }

    if (!professionalId || !docType) {
      return res.status(400).json({ error: 'professionalId y docType son requeridos' });
    }

    const validDocTypes = ['INE', 'CONOCER_CERT'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `docType invalido. Validos: ${validDocTypes.join(', ')}` });
    }

    const professional = await prisma.professional.findUnique({
      where: { id: String(professionalId) },
      select: { id: true, userId: true },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    const isAdmin = requesterRole === 'ADMIN';
    const isOwner = requesterUserId && professional.userId === requesterUserId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'No tienes permiso para subir documentos a este perfil' });
    }

    const fileUrl = file.location || `/uploads/private/${file.filename}`;

    const document = await prisma.verificationDocument.create({
      data: {
        professionalId: professional.id,
        type: docType as any,
        fileUrl,
        status: 'PENDING',
      },
    });

    res.json({
      id: document.id,
      fileUrl: document.fileUrl,
      status: document.status,
      message: 'Documento subido exitosamente. Pendiente de revision.',
    });
  } catch (error) {
    next(error);
  }
});

export { router as verificationRouter };
