import { prisma } from '../../lib/db';

type AppointmentEventInput = {
  appointmentId: string;
  actorUserId?: string | null;
  type: 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULE_REQUESTED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'REMINDER_SENT';
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordAppointmentEvent(input: AppointmentEventInput) {
  return prisma.appointmentEvent.create({
    data: {
      appointmentId: input.appointmentId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      fromStatus: input.fromStatus as any,
      toStatus: input.toStatus as any,
      metadata: (input.metadata ?? undefined) as any,
    },
  });
}
