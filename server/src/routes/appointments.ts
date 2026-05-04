import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { notifyUser } from '../lib/notifications';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Valida que el string sea una fecha ISO válida y la convierte a Date.
 * Devuelve null si el string es inválido.
 */
function parseScheduledAt(raw: string): Date | null {
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Dado un Date, devuelve el dayOfWeek en la zona horaria local del servidor.
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
 */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

// ─── GET /api/appointments/availability/:professionalId ───────────────────────
// Devuelve los bloques de disponibilidad configurados por el profesional.
router.get('/availability/:professionalId', async (req, res, next) => {
  try {
    const { professionalId } = req.params;

    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: { id: true },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    const availabilities = await prisma.availability.findMany({
      where: { professionalId },
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json(availabilities);
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/appointments/my ─────────────────────────────────────────────────
// Obtiene las citas del usuario logueado (como cliente o profesional).
router.get('/my', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let appointments;

    if (role === 'PROFESSIONAL') {
      const prof = await prisma.professional.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!prof) return res.json([]);

      appointments = await prisma.appointment.findMany({
        where: { professionalId: prof.id },
        include: {
          client: { select: { name: true, email: true, avatarUrl: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    } else {
      appointments = await prisma.appointment.findMany({
        where: { clientId: userId },
        include: {
          professional: {
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    }

    res.json(appointments);
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/appointments/availability ─────────────────────────────────────
// Para que los profesionales definan sus bloques de disponibilidad semanal.
router.post('/availability', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;

    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden definir disponibilidad' });
    }

    const prof = await prisma.professional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!prof) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    const { dayOfWeek, startTime, endTime } = req.body;

    // Validaciones básicas
    if (dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime) {
      return res.status(400).json({ error: 'dayOfWeek, startTime y endTime son requeridos' });
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'dayOfWeek debe ser un número entre 0 (domingo) y 6 (sábado)' });
    }

    // Validar formato HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ error: 'startTime y endTime deben tener formato HH:MM (ej: 09:00)' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ error: 'startTime debe ser anterior a endTime' });
    }

    // Upsert: si ya existe disponibilidad para ese día, la actualiza
    const availability = await prisma.availability.upsert({
      where: {
        professionalId_dayOfWeek: {
          professionalId: prof.id,
          dayOfWeek,
        },
      },
      update: { startTime, endTime },
      create: {
        professionalId: prof.id,
        dayOfWeek,
        startTime,
        endTime,
      },
    });

    res.status(201).json(availability);
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/appointments ───────────────────────────────────────────────────
// Crea una nueva cita. Accesible para usuarios autenticados y guests.
router.post('/', optionalAuthenticate, async (req: any, res: any, next: any) => {
  try {
    const clientId = req.user?.userId ?? null;
    const { professionalId, scheduledAt: scheduledAtRaw, service, notes } = req.body;

    // ── Validación de campos requeridos ──────────────────────────────────────
    if (!professionalId || !scheduledAtRaw) {
      return res.status(400).json({ error: 'professionalId y scheduledAt son requeridos' });
    }

    // ── Validación y parseo de fecha ─────────────────────────────────────────
    const scheduledAt = parseScheduledAt(scheduledAtRaw);
    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt debe ser una fecha ISO válida (ej: 2025-06-15T10:00:00.000Z)' });
    }

    // No permitir citas en el pasado
    if (scheduledAt <= new Date()) {
      return res.status(400).json({ error: 'No se pueden agendar citas en fechas pasadas' });
    }

    // ── Verificación 1: El profesional existe ────────────────────────────────
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    // ── Verificación 2: El cliente no agenda con sigo mismo ──────────────────
    if (clientId && professional.userId === clientId) {
      return res.status(400).json({ error: 'No puedes agendar una cita contigo mismo' });
    }

    // ── Verificación 3: El profesional tiene disponibilidad ese día ──────────
    const dayOfWeek = getDayOfWeek(scheduledAt);
    const availability = await prisma.availability.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId,
          dayOfWeek,
        },
      },
    });

    if (!availability) {
      return res.status(409).json({
        error: 'El profesional no tiene disponibilidad configurada para ese día de la semana',
      });
    }

    // ── Verificación 4: El slot está dentro del rango horario ────────────────
    const slotTime = scheduledAt.toTimeString().slice(0, 5); // "HH:MM"
    if (slotTime < availability.startTime || slotTime >= availability.endTime) {
      return res.status(409).json({
        error: `El horario solicitado está fuera del rango disponible (${availability.startTime} - ${availability.endTime})`,
      });
    }

    // ── Asignar guestId si no hay usuario autenticado ────────────────────────
    let guestId: string | null = null;
    if (!clientId) {
      // Validar formato si viene en el body, o generar uno nuevo
      const rawGuestId = req.body.guestId;
      if (rawGuestId && /^guest_\d+$/.test(rawGuestId)) {
        guestId = rawGuestId;
      } else {
        guestId = `guest_${Date.now()}`;
      }
    }

    // ── Crear la cita (el @@unique actúa como barrera final contra duplicados) ──
    let appointment;
    try {
      appointment = await prisma.appointment.create({
        data: {
          clientId,
          guestId,
          professionalId,
          service: service ?? null,
          scheduledAt,
          notes: notes ?? null,
          status: 'SCHEDULED',
        },
      });
    } catch (dbError: any) {
      // P2002 = violación de unique constraint → slot ya reservado (race condition)
      if (dbError.code === 'P2002') {
        return res.status(409).json({
          error: 'Este horario acaba de ser reservado por otro usuario. Por favor elige otro slot.',
        });
      }
      throw dbError; // Cualquier otro error de BD sube al errorHandler global
    }

    // ── Notificar al profesional (fire-and-forget) ───────────────────────────
    notifyUser({
      userId: professional.userId,
      type: 'ORDER_STATUS',
      title: 'Nueva cita agendada',
      body: `Tienes una nueva cita para el ${scheduledAt.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      metadata: { appointmentId: appointment.id },
      email: professional.user.email,
      emailSubject: 'Nueva cita agendada — Intecnia',
      emailHtml: `
        <h2>¡Tienes una nueva cita!</h2>
        <p>Un cliente ha agendado una consulta contigo.</p>
        <p><strong>Fecha y hora:</strong> ${scheduledAt.toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}</p>
        ${service ? `<p><strong>Servicio:</strong> ${service}</p>` : ''}
        ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
      `,
    }).catch(console.error);

    res.status(201).json({ message: 'Cita agendada con éxito', appointment });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/appointments/:id/cancel ──────────────────────────────────────
// Cancela una cita si el usuario es el cliente o el profesional involucrado.
router.patch('/:id/cancel', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const isClient = appointment.clientId === userId;
    const isProfessional = appointment.professional.userId === userId;

    if (!isClient && !isProfessional) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita' });
    }

    if (appointment.status !== 'SCHEDULED') {
      return res.status(400).json({
        error: `No se puede cancelar una cita en estado: ${appointment.status}`,
      });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Notificar a la otra parte (fire-and-forget)
    if (isClient && appointment.professional.user) {
      notifyUser({
        userId: appointment.professional.userId,
        type: 'ORDER_STATUS',
        title: 'Cita cancelada',
        body: `El cliente canceló la cita del ${appointment.scheduledAt?.toLocaleDateString('es-MX') ?? 'fecha no disponible'}`,
        metadata: { appointmentId: id },
        email: appointment.professional.user.email,
        emailSubject: 'Cita cancelada — Intecnia',
        emailHtml: `<p>El cliente ha cancelado la cita agendada. Puedes revisar tu agenda en el dashboard.</p>`,
      }).catch(console.error);
    }

    if (isProfessional && appointment.client) {
      notifyUser({
        userId: appointment.client.id,
        type: 'ORDER_STATUS',
        title: 'Cita cancelada por el profesional',
        body: `El profesional canceló la cita del ${appointment.scheduledAt?.toLocaleDateString('es-MX') ?? 'fecha no disponible'}`,
        metadata: { appointmentId: id },
        email: appointment.client.email,
        emailSubject: 'Tu cita fue cancelada — Intecnia',
        emailHtml: `<p>El profesional ha cancelado tu cita. Te recomendamos agendar un nuevo horario.</p>`,
      }).catch(console.error);
    }

    res.json({ message: 'Cita cancelada con éxito', appointment: updated });
  } catch (error) {
    next(error);
  }
});

export { router as appointmentsRouter };
