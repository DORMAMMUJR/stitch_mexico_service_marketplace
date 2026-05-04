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

const PLATFORM_FEE_RATE = 0.10;
const MAX_PAYOUT_ATTEMPTS = 5;

// Backoff exponencial en horas: intento 1→1h, 2→2h, 3→4h, 4→8h, 5→16h
function getBackoffHours(attempt: number): number {
  return Math.pow(2, attempt - 1);
}

function isBackoffElapsed(lastAttemptAt: Date | null, attempt: number): boolean {
  if (!lastAttemptAt) return true;
  const backoffMs = getBackoffHours(attempt) * 60 * 60 * 1000;
  return Date.now() - lastAttemptAt.getTime() >= backoffMs;
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
      console.warn(`⚠️  Payout: Stripe no configurado. Orden ${orderId} requiere payout manual.`);

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe no está configurado en este entorno. Payout manual requerido.',
      }).catch(e => console.error('Error marcando PAYOUT_FALLIDO (sin Stripe):', e));

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
      console.error(`❌ Payout: orden ${orderId} no encontrada`);
      return false;
    }

    if (!order.professional.stripeAccountId) {
      console.warn(
        `⚠️  Payout: profesional de orden ${orderId} no tiene cuenta Stripe Connect.`
      );

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error: 'NO_STRIPE_ACCOUNT',
        message: 'El profesional no ha completado el onboarding de Stripe.',
      }).catch(e => console.error('Error marcando PAYOUT_FALLIDO (sin cuenta):', e));

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

      console.log(
        `✅ Payout exitoso para orden ${orderId}: transfer ${transfer.id} | ` +
        `$${(transferAmountCents / 100).toFixed(2)} ${currency.toUpperCase()} → profesional`
      );

      await this.transition(orderId, 'PAYOUT_COMPLETADO', {
        stripeTransferId:     transfer.id,
        transferAmountCents,
        platformFeeCents,
        currency,
      });

      return true;
    } catch (stripeError: any) {
      console.error(`❌ Payout fallido para orden ${orderId}: ${stripeError.message}`);

      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error:          stripeError.message,
        stripeErrorCode: stripeError.code,
      }).catch(e => console.error('Error marcando PAYOUT_FALLIDO:', e));

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
    const ordersToRelease = await prisma.order.findMany({
      where: {
        status:      'COMPLETADO',
        completedAt: { lt: timeoutDate },
      },
    });

    if (ordersToRelease.length === 0) {
      console.log('   No hay órdenes pendientes de payout.');
    } else {
      console.log(
        `   Procesando ${ordersToRelease.length} orden(es) para payout automático...`
      );

      for (const order of ordersToRelease) {
        try {
          await this.transition(order.id, 'PAYOUT_INICIADO', {
            reason: 'AUTOMATIC_TIMEOUT_72H',
          });
          console.log(`   📋 Orden ${order.id} → PAYOUT_INICIADO`);
          await this.executePayout(order.id);
        } catch (error: any) {
          if (error.message?.includes('Invalid transition')) {
            console.log(`   ⚠️  Orden ${order.id} ya fue procesada por otra instancia.`);
          } else {
            console.error(`   ❌ Error procesando orden ${order.id}:`, error.message);
          }
        }
      }
    }

    // ── 2. Reintentar PAYOUT_FALLIDO con backoff y límite ────────────────────
    const failedOrders = await prisma.order.findMany({
      where: {
        status:         'PAYOUT_FALLIDO',
        payoutAttempts: { lt: MAX_PAYOUT_ATTEMPTS },
      },
    });

    if (failedOrders.length === 0) {
      console.log('   No hay pagos fallidos pendientes de reintento.');
      return;
    }

    console.log(
      `   🔁 Evaluando ${failedOrders.length} pago(s) fallido(s) para reintento...`
    );

    for (const order of failedOrders) {
      // Verificar si el backoff ya transcurrió antes de reintentar
      if (!isBackoffElapsed(order.lastPayoutAttemptAt, order.payoutAttempts)) {
        console.log(
          `   ⏳ Orden ${order.id}: backoff activo ` +
          `(intento ${order.payoutAttempts}, esperar ${getBackoffHours(order.payoutAttempts)}h)`
        );
        continue;
      }

      try {
        await this.transition(order.id, 'PAYOUT_INICIADO', { reason: 'RETRY' });
        console.log(
          `   🔁 Reintentando orden ${order.id} ` +
          `(intento ${order.payoutAttempts + 1}/${MAX_PAYOUT_ATTEMPTS})`
        );
        await this.executePayout(order.id);
      } catch (e: any) {
        console.error(`   ❌ Retry fallido para orden ${order.id}:`, e.message);
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
      console.warn(
        `   🚨 ${exhaustedOrders.length} orden(es) agotaron ${MAX_PAYOUT_ATTEMPTS} intentos de payout.`
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
        }).catch(console.error);
      }
    }
  }
}
