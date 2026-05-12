/**
 * server/src/lib/notifications.ts
 *
 * Servicio centralizado de notificaciones.
 * Encapsula la creación del registro en BD + envío de email
 * en una sola llamada no-bloqueante.
 *
 * Uso:
 *   notifyUser({ userId, type, title, body, metadata, email, emailSubject, emailHtml })
 */

import { NotificationType } from '@prisma/client';
import { prisma } from './db';
import { sendEmail } from './email';
import { logger } from './logger';

interface NotifyUserParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  // Opcionales — si se proveen, también se envía email
  email?: string;
  emailSubject?: string;
  emailHtml?: string;
}

/**
 * Crea una notificación en BD y opcionalmente envía email.
 * Siempre fire-and-forget: nunca lanza, solo loguea errores.
 * Llamar sin await cuando no se quiere bloquear la respuesta HTTP.
 */
export async function notifyUser(params: NotifyUserParams): Promise<void> {
  const { userId, type, title, body, metadata, email, emailSubject, emailHtml } = params;

  // 1. Persistir notificación en BD
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: metadata ?? {},
      },
    });
  } catch (err) {
    logger.error({ err, userId, type }, '[notifyUser] Error creando notificación en BD');
  }

  // 2. Enviar email si se proveyeron los datos
  if (email && emailSubject && emailHtml) {
    try {
      await sendEmail({ to: email, subject: emailSubject, html: emailHtml });
    } catch (err) {
      logger.error({ err, userId, email }, '[notifyUser] Error enviando email');
    }
  }
}

/**
 * Notifica a todos los admins del sistema.
 * Útil para alertas críticas como payout fallido repetido.
 */
export async function notifyAdmins(params: Omit<NotifyUserParams, 'userId'>): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true },
    });

    if (admins.length === 0) {
      logger.warn('[notifyAdmins] No hay usuarios ADMIN registrados en el sistema.');
      return;
    }

    await Promise.all(
      admins.map(admin =>
        notifyUser({
          ...params,
          userId: admin.id,
          email: admin.email,
        })
      )
    );
  } catch (err) {
    logger.error({ err }, '[notifyAdmins] Error notificando admins');
  }
}
