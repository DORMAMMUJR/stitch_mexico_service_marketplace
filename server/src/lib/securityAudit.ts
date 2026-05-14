import { prisma } from './db';
import { logger } from './logger';
import { Prisma } from '@prisma/client';

type AuditEventInput = {
  action: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  appointmentId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function logSecurityAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.securityAuditEvent.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId || null,
        targetUserId: input.targetUserId || null,
        appointmentId: input.appointmentId || null,
        conversationId: input.conversationId || null,
        metadata: (input.metadata || undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.warn({ err: error, action: input.action }, 'No se pudo registrar evento de auditoria de seguridad');
  }
}
