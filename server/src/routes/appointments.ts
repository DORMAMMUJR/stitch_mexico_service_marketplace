import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// GET /api/appointments/availability/:professionalId
router.get('/availability/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params;
    const availabilities = await prisma.availability.findMany({
      where: { professionalId },
    });
    res.json(availabilities);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/appointments/my
// Obtiene las citas del usuario logueado (como cliente o profesional)
router.get('/my', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let appointments;
    if (role === 'PROFESSIONAL') {
      // Buscar el professionalId primero
      const prof = await prisma.professional.findUnique({ where: { userId } });
      if (!prof) return res.json([]); // Sin perfil = sin citas, no error
      
      appointments = await prisma.appointment.findMany({
        where: { professionalId: prof.id },
        include: { client: { select: { name: true, email: true, avatarUrl: true } } },
        orderBy: { date: 'asc' }
      });
    } else {
      appointments = await prisma.appointment.findMany({
        where: { clientId: userId },
        include: { professional: { include: { user: { select: { name: true, avatarUrl: true } } } } },
        orderBy: { date: 'asc' }
      });
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching my appointments:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/appointments/availability
// Para que los profesionales definan sus slots
router.post('/availability', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden definir disponibilidad' });
    }

    const prof = await prisma.professional.findUnique({ where: { userId } });
    if (!prof) return res.status(404).json({ error: 'Perfil profesional no encontrado' });

    const { dayOfWeek, startTime, endTime } = req.body; // e.g. 1 (Lunes), "09:00", "17:00"

    const availability = await prisma.availability.create({
      data: {
        professionalId: prof.id,
        dayOfWeek,
        startTime,
        endTime
      }
    });

    res.status(201).json(availability);
  } catch (error) {
    console.error('Error creating availability:', error);
    res.status(500).json({ error: 'Error interno al guardar disponibilidad' });
  }
});

// POST /api/appointments
// Crea una nueva cita para un usuario autenticado o un guest
router.post('/', optionalAuthenticate, async (req: any, res: any) => {
  try {
    const clientId = req.user?.userId || null;
    const { professionalId, date, time, service } = req.body;

    if (!professionalId || !date) {
      return res.status(400).json({ error: 'Faltan datos requeridos (professionalId, date)' });
    }

    let guestId = null;
    if (!clientId) {
      // Si es guest, le asignamos un guest_id basado en session o lo generamos
      guestId = req.body.client_id || `guest_${Date.now()}`;
    }

    // Crear la cita
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        guestId,
        professionalId,
        service,
        date,
        time,
        status: 'SCHEDULED',
      },
    });

    res.status(201).json({ message: 'Cita agendada con éxito', appointment });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Error interno al agendar cita' });
  }
});

// PATCH /api/appointments/:id/cancel
// Cancela una cita si el usuario es el cliente o el profesional involucrado
router.patch('/:id/cancel', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { professional: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    if (appointment.clientId !== userId && appointment.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta cita' });
    }

    if (appointment.status !== 'SCHEDULED') {
      return res.status(400).json({ error: `No se puede cancelar una cita en estado: ${appointment.status}` });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    res.json({ message: 'Cita cancelada con éxito', appointment: updated });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Error interno al cancelar cita' });
  }
});

export { router as appointmentsRouter };
