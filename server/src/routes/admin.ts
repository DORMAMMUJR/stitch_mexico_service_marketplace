import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../lib/email';
import { notifyUser } from '../lib/notifications';

const router = Router();

function parseAppointmentMeta(notes?: string | null): any {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function isStrongPassword(password: string) {
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpper && hasLower && hasNumber;
}

// FIX: Guard de ADMIN centralizado — se aplica a TODAS las rutas del router.
// Elimina la necesidad de repetir el check en cada handler individualmente.
// Si alguien agrega un nuevo endpoint y olvida el check, igual queda protegido.
router.use(authenticate, (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  next();
});

// GET /api/admin/operators
router.get('/operators', async (_req: any, res: any, next: any) => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(operators);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/operators
router.post('/operators', async (req: any, res: any, next: any) => {
  try {
    const rawName = String(req.body?.name || '').trim();
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    const rawPassword = String(req.body?.password || '');

    if (!rawName) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }

    if (!isStrongPassword(rawPassword)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const created = await prisma.user.create({
      data: {
        name: rawName,
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/verifications/pending
router.get('/verifications/pending', async (req, res, next) => {
  try {
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
    next(error);
  }
});

// PATCH /api/admin/verifications/:id/approve
router.patch('/verifications/:id/approve', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

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
    next(error);
  }
});

// PATCH /api/admin/verifications/:id/reject
router.patch('/verifications/:id/reject', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

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
    next(error);
  }
});

// GET /api/admin/appointments/upcoming
router.get('/appointments/upcoming', async (_req: any, res: any, next: any) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING_PAYMENT', 'SCHEDULED'] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        professional: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    const normalized = appointments.map((a) => {
      const meta = parseAppointmentMeta(a.notes);
      return {
        ...a,
        meetingLink: meta?.meetingLink ?? null,
      };
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/professionals/active
router.get('/professionals/active', async (_req: any, res: any, next: any) => {
  try {
    const professionals = await prisma.professional.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        title: true,
        category: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(professionals.map((p) => ({
      id: p.id,
      name: p.user?.name || 'Profesional',
      email: p.user?.email || null,
      title: p.title || '',
      category: p.category,
    })));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/appointments/:id/meeting-link
router.patch('/appointments/:id/meeting-link', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { meetingLink } = req.body;

    if (!meetingLink || typeof meetingLink !== 'string' || !/^https?:\/\//i.test(meetingLink.trim())) {
      return res.status(400).json({ error: 'Debes enviar un link válido (http/https)' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        professional: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const currentMeta = parseAppointmentMeta(appointment.notes) || {};
    const updatedNotes = JSON.stringify({
      ...currentMeta,
      meetingLink: meetingLink.trim(),
      meetingLinkUpdatedAt: new Date().toISOString(),
    });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { notes: updatedNotes },
    });

    if (appointment.clientId && appointment.client) {
      notifyUser({
        userId: appointment.clientId,
        type: 'ORDER_STATUS',
        title: 'Link de videollamada asignado',
        body: `Tu cita ya tiene link: ${meetingLink.trim()}`,
        metadata: { appointmentId: appointment.id, meetingLink: meetingLink.trim() },
        email: appointment.client.email,
        emailSubject: 'Link de tu cita — Intecnia',
        emailHtml: `<p>Tu cita ya tiene link de videollamada:</p><p><a href="${meetingLink.trim()}">${meetingLink.trim()}</a></p>`,
      }).catch(console.error);
    }

    notifyUser({
      userId: appointment.professional.userId,
      type: 'ORDER_STATUS',
      title: 'Link de videollamada actualizado',
      body: `La cita del ${appointment.scheduledAt?.toLocaleDateString('es-MX') ?? ''} tiene nuevo link.`,
      metadata: { appointmentId: appointment.id, meetingLink: meetingLink.trim() },
      email: appointment.professional.user.email,
      emailSubject: 'Link actualizado — Intecnia',
      emailHtml: `<p>Se actualizó el link de la cita:</p><p><a href="${meetingLink.trim()}">${meetingLink.trim()}</a></p>`,
    }).catch(console.error);

    res.json({ message: 'Link de cita actualizado y enviado', appointment: { ...updated, meetingLink: meetingLink.trim() } });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };
