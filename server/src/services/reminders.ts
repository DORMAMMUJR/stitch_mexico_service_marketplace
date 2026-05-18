import { prisma } from '../lib/db';
import { notifyUser } from '../lib/notifications';
import { logger } from '../lib/logger';
import { recordAppointmentEvent } from './appointments/events';

export async function createDefaultReminderJobs(appointmentId: string, scheduledAt: Date) {
  const reminderAt = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
  if (reminderAt <= new Date()) return [];

  return prisma.reminderJob.createMany({
    data: [
      {
        appointmentId,
        channel: 'EMAIL',
        scheduledFor: reminderAt,
      },
    ],
    skipDuplicates: true,
  });
}

export async function runDueReminderJobs(limit = 25) {
  const jobs = await prisma.reminderJob.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
    include: {
      appointment: {
        include: {
          client: { select: { id: true, email: true, name: true } },
          professional: { include: { user: { select: { id: true, email: true, name: true } } } },
        },
      },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  const results = [];
  for (const job of jobs) {
    try {
      const appointment = job.appointment;
      const scheduledAt = appointment.scheduledAt;
      if (!scheduledAt || !appointment.clientId || !appointment.client) {
        await prisma.reminderJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', failedAt: new Date(), error: 'Cita sin cliente u horario confirmado' },
        });
        continue;
      }

      await notifyUser({
        userId: appointment.clientId,
        type: 'ORDER_STATUS',
        title: 'Recordatorio de cita',
        body: `Tu cita esta programada para ${scheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}.`,
        metadata: { appointmentId: appointment.id, reminderJobId: job.id },
        email: appointment.client.email,
        emailSubject: 'Recordatorio de cita - Intecnia',
        emailHtml: `<p>Te recordamos que tu cita esta programada para ${scheduledAt.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}.</p>`,
      });

      await prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      await recordAppointmentEvent({
        appointmentId: appointment.id,
        type: 'REMINDER_SENT',
        metadata: { channel: job.channel, reminderJobId: job.id },
      });
      results.push({ id: job.id, status: 'SENT' });
    } catch (error: any) {
      logger.error({ err: error, reminderJobId: job.id }, 'Error enviando recordatorio');
      await prisma.reminderJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', failedAt: new Date(), error: error?.message || 'Error enviando recordatorio' },
      });
      results.push({ id: job.id, status: 'FAILED' });
    }
  }

  return results;
}
