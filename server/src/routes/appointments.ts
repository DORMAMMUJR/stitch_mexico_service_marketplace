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

export { router as appointmentsRouter };
