import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { runDueReminderJobs } from '../services/reminders';

const router = Router();

router.post('/run-due', authenticate, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo admin puede ejecutar recordatorios manualmente' });
    }
    const results = await runDueReminderJobs();
    res.json({ processed: results.length, results });
  } catch (error) {
    next(error);
  }
});

router.get('/appointment/:appointmentId', authenticate, async (req: any, res, next) => {
  try {
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { professional: { select: { userId: true } } },
    });
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    if (role !== 'ADMIN' && appointment.clientId !== userId && appointment.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver recordatorios de esta cita' });
    }

    const jobs = await prisma.reminderJob.findMany({
      where: { appointmentId: appointment.id },
      orderBy: { scheduledFor: 'asc' },
    });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

export { router as remindersRouter };
