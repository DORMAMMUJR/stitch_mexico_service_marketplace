import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';

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
      if (!prof) return res.status(404).json({ error: 'Perfil profesional no encontrado' });
      
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
// Crea una nueva cita para un usuario autenticado
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const clientId = req.user?.userId;
    const { professionalId, date, notes } = req.body;

    if (!clientId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!professionalId || !date) {
      return res.status(400).json({ error: 'Faltan datos requeridos (professionalId, date)' });
    }

    // Verificar si el cliente existe
    const client = await prisma.user.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Crear la cita
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        professionalId,
        date: new Date(date),
        notes,
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
