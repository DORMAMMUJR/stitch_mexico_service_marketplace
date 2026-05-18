/**
 * server/src/lib/escrow.ts
 *
 * Máquina de estados para el flujo de pagos en escrow.
 * Incluye backoff con límite de reintentos para payouts fallidos.
 */

import { Prisma, OrderStatus, Order } from '@prisma/client';
import { prisma } from './db';
import { getStripe } from './stripe';
import { notifyAdmins } from './notifications';
import { logger } from './logger';

const PLATFORM_FEE_RATE = 0.10;
const MAX_PAYOUT_ATTEMPTS = 5;

async function claimOrdersForInitialPayout(timeoutDate: Date): Promise<Array<{ id: string }>> {
  return prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "Order"
    SET "status" = CAST('PAYOUT_INICIADO' AS "OrderStatus")
    WHERE "id" IN (
      SELECT "id"
      FROM "Order"
      WHERE "status" = CAST('COMPLETADO' AS "OrderStatus")
        AND "completedAt" < ${timeoutDate}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `;
}

async function claimOrdersForRetryPayout(): Promise<Array<{ id: string; payoutAttempts: number }>> {
  return prisma.$queryRaw<Array<{ id: string; payoutAttempts: number }>>`
    UPDATE "Order"
    SET "status" = CAST('PAYOUT_INICIADO' AS "OrderStatus")
    WHERE "id" IN (
      SELECT "id"
      FROM "Order"
      WHERE "status" = CAST('PAYOUT_FALLIDO' AS "OrderStatus")
        AND "payoutAttempts" < ${MAX_PAYOUT_ATTEMPTS}
        AND (
          "lastPayoutAttemptAt" IS NULL OR
          NOW() - "lastPayoutAttemptAt" >= INTERVAL '1 hour' * POWER(2, GREATEST("payoutAttempts", 1) - 1)
        )
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "payoutAttempts"
  `;
}

export class EscrowStateMachine {

  static async transition(
    orderId: string,
    newState: OrderStatus,
    metadata: any = {}
  ): Promise<Order> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });

      if (!order) {
        throw new Error('Order not found');
      }

      const isValid = this.isValidTransition(order.status, newState);
      if (!isValid) {
        throw new Error(`Invalid transition from ${order.status} to ${newState}`);
      }

      const updateData: any = { status: newState };

      if (newState === 'FONDOS_EN_ESCROW') {
        updateData.escrowFundedAt = new Date();
      } else if (newState === 'COMPLETADO') {
        updateData.completedAt = new Date();
      } else if (newState === 'PAYOUT_COMPLETADO') {
        updateData.escrowReleasedAt = new Date();
      } else if (newState === 'EN_DISPUTA') {
        updateData.disputeOpenedAt = new Date();
        updateData.disputeReason = metadata.reason;
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          event: newState,
          metadata,
        },
      });

      return updatedOrder;
    });
  }

  private static isValidTransition(
    current: OrderStatus,
    next: OrderStatus
  ): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      DRAFT:             ['PAGO_PENDIENTE', 'CANCELADO'],
      PAGO_PENDIENTE:    ['FONDOS_EN_ESCROW', 'CANCELADO'],
      FONDOS_EN_ESCROW:  ['EN_PROGRESO', 'CANCELADO'],
      EN_PROGRESO:       ['COMPLETADO', 'EN_DISPUTA'],
      COMPLETADO:        ['PAYOUT_INICIADO', 'EN_DISPUTA'],
      EN_DISPUTA:        ['REEMBOLSADO', 'PAYOUT_INICIADO'],
      PAYOUT_INICIADO:   ['PAYOUT_COMPLETADO', 'PAYOUT_FALLIDO'],
      PAYOUT_FALLIDO:    ['PAYOUT_INICIADO'],
      PAYOUT_COMPLETADO: [],
      CANCELADO:         ['REEMBOLSADO'],
      REEMBOLSADO:       [],
    };

    return transitions[current]?.includes(next) ?? false;
  }

  /**
   * Ejecuta la transferencia real de fondos via Stripe Connect.
   * Actualiza payoutAttempts y lastPayoutAttemptAt en cada intento.
   */
  static async executePayout(orderId: string): Promise<boolean> {
    // Registrar el intento antes de cualquier llamada externa
    await prisma.order.update({
      where: { id: orderId },
      data: {
        payoutAttempts: { increment: 1 },
        lastPayoutAttemptAt: new Date(),
      },
    });

    // Verificar que Stripe esté disponible
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      logger.warn({ orderId }, 'Payout: Stripe no configurado. Requiere payout manual.');

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe no está configurado en este entorno. Payout manual requerido.',
      }).catch((e) => logger.error({ err: e, orderId }, 'Error marcando PAYOUT_FALLIDO (sin Stripe)'));

      return false;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        professional: {
          select: { id: true, stripeAccountId: true },
        },
      },
    });

    if (!order) {
      logger.error({ orderId }, 'Payout: orden no encontrada');
      return false;
    }

    if (!order.professional.stripeAccountId) {
      logger.warn({ orderId, professionalId: order.professionalId }, 'Payout: profesional sin cuenta Stripe Connect');

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error: 'NO_STRIPE_ACCOUNT',
        message: 'El profesional no ha completado el onboarding de Stripe.',
      }).catch((e) => logger.error({ err: e, orderId }, 'Error marcando PAYOUT_FALLIDO (sin cuenta)'));

      return false;
    }

    const totalAmountCents   = Math.round(Number(order.agreedPrice) * 100);
    const platformFeeCents   = Math.round(totalAmountCents * PLATFORM_FEE_RATE);
    const transferAmountCents = totalAmountCents - platformFeeCents;
    const currency           = (order.currency || 'mxn').toLowerCase();

    try {
      const transfer = await stripe.transfers.create(
        {
          amount:      transferAmountCents,
          currency,
          destination: order.professional.stripeAccountId,
          metadata: {
            orderId:          order.id,
            professionalId:   order.professionalId,
            platformFeeCents: String(platformFeeCents),
            releaseReason:    'AUTO_RELEASE_72H',
          },
        },
        {
          idempotencyKey: `payout-${orderId}`, // Crítico: evita doble pago
        }
      );

      logger.info(
        {
          orderId,
          transferId: transfer.id,
          transferAmountCents,
          currency: currency.toUpperCase(),
        },
        'Payout exitoso'
      );

      await this.transition(orderId, 'PAYOUT_COMPLETADO', {
        stripeTransferId:     transfer.id,
        transferAmountCents,
        platformFeeCents,
        currency,
      });

      return true;
    } catch (stripeError: any) {
      logger.error({ err: stripeError, orderId }, 'Payout fallido');

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error:          stripeError.message,
        stripeErrorCode: stripeError.code,
      }).catch((e) => logger.error({ err: e, orderId }, 'Error marcando PAYOUT_FALLIDO'));

      return false;
    }
  }

  /**
   * Cron job: libera fondos de órdenes completadas hace más de 72h.
   * Reintenta PAYOUT_FALLIDO con backoff exponencial y límite de 5 intentos.
   */
  static async processAutoReleases(): Promise<void> {
    const timeoutDate = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // ── 1. Órdenes COMPLETADO listas para su primer payout ───────────────────
    const ordersToRelease = await claimOrdersForInitialPayout(timeoutDate);

    if (ordersToRelease.length === 0) {
      logger.info('No hay órdenes pendientes de payout');
    } else {
      logger.info({ count: ordersToRelease.length }, 'Procesando órdenes para payout automático');

      for (const order of ordersToRelease) {
        try {
          await prisma.orderEvent.create({
            data: {
              orderId: order.id,
              event: 'PAYOUT_INICIADO',
              metadata: {
                reason: 'AUTOMATIC_TIMEOUT_72H',
                claimedByCron: true,
              },
            },
          });
          logger.info({ orderId: order.id }, 'Orden reclamada y en PAYOUT_INICIADO');
          await this.executePayout(order.id);
        } catch (error: any) {
          logger.error({ err: error, orderId: order.id }, 'Error procesando orden para payout');
        }
      }
    }

    // ── 2. Reintentar PAYOUT_FALLIDO con backoff y límite ────────────────────
    const failedOrders = await claimOrdersForRetryPayout();

    if (failedOrders.length === 0) {
      logger.info('No hay pagos fallidos pendientes de reintento');
    } else {
      logger.info({ count: failedOrders.length }, 'Evaluando pagos fallidos para reintento');

      for (const order of failedOrders) {
        try {
          await prisma.orderEvent.create({
            data: {
              orderId: order.id,
              event: 'PAYOUT_INICIADO',
              metadata: { reason: 'RETRY', claimedByCron: true },
            },
          });
          logger.info(
            {
              orderId: order.id,
              attempt: order.payoutAttempts + 1,
              maxAttempts: MAX_PAYOUT_ATTEMPTS,
            },
            'Reintentando payout de orden'
          );
          await this.executePayout(order.id);
        } catch (e: any) {
          logger.error({ err: e, orderId: order.id }, 'Retry de payout fallido');
        }
      }
    }

    // ── 3. Alertar admins por órdenes que agotaron todos los intentos ─────────
    const exhaustedOrders = await prisma.order.findMany({
      where: {
        status:         'PAYOUT_FALLIDO',
        payoutAttempts: { gte: MAX_PAYOUT_ATTEMPTS },
      },
      select: { id: true, agreedPrice: true, currency: true, professionalId: true },
    });

    if (exhaustedOrders.length > 0) {
      logger.warn(
        { count: exhaustedOrders.length, maxAttempts: MAX_PAYOUT_ATTEMPTS },
        'Órdenes agotaron intentos de payout'
      );

      for (const order of exhaustedOrders) {
        notifyAdmins({
          type:  'SYSTEM',
          title: '🚨 Payout requiere intervención manual',
          body:  `La orden ${order.id} agotó ${MAX_PAYOUT_ATTEMPTS} intentos de payout automático y requiere revisión manual.`,
          metadata: {
            orderId:       order.id,
            agreedPrice:   order.agreedPrice,
            currency:      order.currency,
            professionalId: order.professionalId,
          },
        }).catch((error) => logger.error({ err: error, orderId: order.id }, 'Error notificando payout agotado'));
      }
    }
  }
}
