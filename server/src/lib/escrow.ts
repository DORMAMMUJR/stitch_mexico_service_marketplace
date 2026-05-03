import { Prisma, OrderStatus, Order } from '@prisma/client';
import { prisma } from './db';
import { stripe } from './stripe';

// Comisión de la plataforma (10%). Ajustar según modelo de negocio.
const PLATFORM_FEE_RATE = 0.10;

export class EscrowStateMachine {
  
  static async transition(orderId: string, newState: OrderStatus, metadata: any = {}): Promise<Order> {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Validar transiciones según la máquina de estados definida
      const isValid = this.isValidTransition(order.status, newState);
      if (!isValid) {
        throw new Error(`Invalid transition from ${order.status} to ${newState}`);
      }

      // Actualizar la orden
      const updateData: any = { status: newState };
      
      // Manejo de campos especiales dependiendo del estado
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
        data: updateData
      });

      // Registrar el evento
      await tx.orderEvent.create({
        data: {
          orderId,
          event: newState,
          metadata: metadata
        }
      });

      return updatedOrder;
    });
  }

  private static isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      DRAFT: ['PAGO_PENDIENTE', 'CANCELADO'],
      PAGO_PENDIENTE: ['FONDOS_EN_ESCROW', 'CANCELADO'],
      FONDOS_EN_ESCROW: ['EN_PROGRESO', 'CANCELADO'],
      EN_PROGRESO: ['COMPLETADO', 'EN_DISPUTA'],
      COMPLETADO: ['PAYOUT_INICIADO', 'EN_DISPUTA'],
      EN_DISPUTA: ['REEMBOLSADO', 'PAYOUT_INICIADO'], // Resoluciones del admin
      PAYOUT_INICIADO: ['PAYOUT_COMPLETADO', 'PAYOUT_FALLIDO'],
      PAYOUT_FALLIDO: ['PAYOUT_INICIADO'], // Retries
      PAYOUT_COMPLETADO: [], // Estado terminal
      CANCELADO: ['REEMBOLSADO'], // Si había fondos
      REEMBOLSADO: [] // Estado terminal
    };

    return transitions[current]?.includes(next) || false;
  }

  /**
   * Ejecuta la transferencia real de fondos a la cuenta Stripe Connect del profesional.
   * Descuenta la comisión de la plataforma (PLATFORM_FEE_RATE) antes de transferir.
   * Retorna true si el payout fue exitoso, false si falló.
   */
  static async executePayout(orderId: string): Promise<boolean> {
    // Obtener la orden con los datos del profesional
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        professional: {
          select: { id: true, stripeAccountId: true }
        }
      }
    });

    if (!order) {
      console.error(`❌ Payout: orden ${orderId} no encontrada`);
      return false;
    }

    if (!order.professional.stripeAccountId) {
      console.warn(`⚠️  Payout: profesional de orden ${orderId} no tiene cuenta Stripe Connect. Payout manual requerido.`);
      // No fallamos — la orden ya está en PAYOUT_INICIADO, un admin puede resolverla manualmente
      return false;
    }

    const totalAmountCents = Math.round(Number(order.agreedPrice) * 100);
    const platformFeeCents = Math.round(totalAmountCents * PLATFORM_FEE_RATE);
    const transferAmountCents = totalAmountCents - platformFeeCents;
    const currency = (order.currency || 'mxn').toLowerCase();

    try {
      // Crear la transferencia a la cuenta conectada del profesional
      const transfer = await stripe.transfers.create({
        amount: transferAmountCents,
        currency,
        destination: order.professional.stripeAccountId,
        metadata: {
          orderId: order.id,
          professionalId: order.professionalId,
          platformFeeCents: String(platformFeeCents),
          releaseReason: 'AUTO_RELEASE_72H',
        },
      });

      console.log(`✅ Payout exitoso para orden ${orderId}: transfer ${transfer.id} | $${(transferAmountCents / 100).toFixed(2)} ${currency.toUpperCase()} → profesional`);

      // Marcar la orden como PAYOUT_COMPLETADO
      await this.transition(orderId, 'PAYOUT_COMPLETADO', {
        stripeTransferId: transfer.id,
        transferAmountCents,
        platformFeeCents,
        currency,
      });

      return true;
    } catch (stripeError: any) {
      console.error(`❌ Payout fallido para orden ${orderId}: ${stripeError.message}`);

      // Marcar como PAYOUT_FALLIDO para que el admin pueda hacer retry
      await this.transition(orderId, 'PAYOUT_FALLIDO', {
        error: stripeError.message,
        stripeErrorCode: stripeError.code,
      }).catch(e => console.error('Error marcando PAYOUT_FALLIDO:', e));

      return false;
    }
  }

  /**
   * Cron job: libera fondos de órdenes completadas hace más de 72h sin disputa.
   * Ejecuta: 1. Transición a PAYOUT_INICIADO, 2. Transferencia Stripe real.
   */
  static async processAutoReleases() {
    const timeoutDate = new Date(Date.now() - (72 * 60 * 60 * 1000)); // 72 horas
    
    const ordersToRelease = await prisma.order.findMany({
      where: {
        status: 'COMPLETADO',
        completedAt: { lt: timeoutDate }
      }
    });

    if (ordersToRelease.length === 0) {
      console.log('   No hay órdenes pendientes de payout.');
      return;
    }

    console.log(`   Procesando ${ordersToRelease.length} orden(es) para payout automático...`);

    for (const order of ordersToRelease) {
      try {
        // Paso 1: Transicionar a PAYOUT_INICIADO (registra el evento en BD)
        await this.transition(order.id, 'PAYOUT_INICIADO', { reason: 'AUTOMATIC_TIMEOUT_72H' });
        console.log(`   📋 Orden ${order.id} → PAYOUT_INICIADO`);

        // Paso 2: Ejecutar la transferencia real a Stripe Connect
        await this.executePayout(order.id);
      } catch (error: any) {
        console.error(`   ❌ Error procesando orden ${order.id}:`, error.message);
      }
    }
  }
}

