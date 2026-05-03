import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../lib/email';
import { uploadDoc } from '../lib/upload';

const router = Router();

// GET /api/admin/verifications/pending
router.get('/verifications/pending', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const pendingDocs = await prisma.verificationDocument.findMany({
      where: { status: 'PENDING' },
      include: {
        professional: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pendingDocs);
  } catch (error) {
    console.error('Error fetching pending verifications:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/admin/verifications/:id/approve
router.patch('/verifications/:id/approve', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const adminId = user.userId;

    const result = await prisma.$transaction(async (tx: any) => {
      const doc = await tx.verificationDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      if (doc.type === 'SAT_CONSTANCIA') {
        const updatedProf = await tx.professional.update({
          where: { id: doc.professionalId },
          data: { isVerified: true, verificationStatus: 'APPROVED', satVerifiedAt: new Date() },
          include: { user: true }
        });

        sendEmail({
          to: updatedProf.user.email,
          subject: '¡Verificación Aprobada! - Intecnia',
          html: emailTemplates.verificationApproved(updatedProf.user.name)
        }).catch(console.error);
      }
      return doc;
    });

    res.json({ message: 'Documento aprobado exitosamente', document: result });
  } catch (error) {
    res.status(500).json({ error: 'Error interno al aprobar documento' });
  }
});

// PATCH /api/admin/verifications/:id/reject
router.patch('/verifications/:id/reject', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const adminId = user.userId;

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });
    }

    const doc = await prisma.verificationDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        professional: {
          include: { user: true }
        }
      }
    });

    sendEmail({
      to: doc.professional.user.email,
      subject: 'Actualizacion requerida en tu Verificacion - Intecnia',
      html: emailTemplates.verificationRejected(doc.professional.user.name, reason.trim())
    }).catch(console.error);

    res.json({ message: 'Documento rechazado. Se notificara al profesional.', document: doc });
  } catch (error) {
    console.error('Error rejecting document:', error);
    res.status(500).json({ error: 'Error interno al rechazar documento' });
  }
});

// POST /api/admin/verification/upload
router.post('/verification/upload', authenticate, uploadDoc.single('constancia'), async (req: any, res) => {
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
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});

export { router as adminRouter };
