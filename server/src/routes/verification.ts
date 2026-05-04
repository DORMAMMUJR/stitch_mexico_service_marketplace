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

    if (!file) {
      return res.status(400).json({ error: 'No se cargó ningún archivo' });
    }

    if (!professionalId || !docType) {
      return res.status(400).json({ error: 'professionalId y docType son requeridos' });
    }

    const validDocTypes = ['INE', 'PASSPORT', 'SAT_CONSTANCIA', 'CONOCER_CERT', 'COMPROBANTE_DOMICILIO'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: `docType inválido. Válidos: ${validDocTypes.join(', ')}` });
    }

    const fileUrl = file.location || `/uploads/${file.filename}`;

    const document = await prisma.verificationDocument.create({
      data: {
        professionalId,
        type: docType as any,
        fileUrl,
        status: 'PENDING',
      },
    });

    res.json({
      id: document.id,
      fileUrl: document.fileUrl,
      status: document.status,
      message: 'Documento subido exitosamente. Pendiente de revisión.',
    });
  } catch (error) {
    next(error);
  }
});

export { router as verificationRouter };
