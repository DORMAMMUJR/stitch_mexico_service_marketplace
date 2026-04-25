import { Prisma, OrderStatus, Order, OrderEvent, DisputeResolution } from '@prisma/client';
import { prisma } from './db';

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

      // TODO: Aquí se deberían disparar las notificaciones usando un event emitter o similar

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

  // Método para el cron job de timeout automático
  static async processAutoReleases() {
    // 72h = 72 * 60 * 60 * 1000 ms
    const timeoutDate = new Date(Date.now() - (72 * 60 * 60 * 1000));
    
    const ordersToRelease = await prisma.order.findMany({
      where: {
        status: 'COMPLETADO',
        completedAt: {
          lt: timeoutDate
        }
      }
    });

    for (const order of ordersToRelease) {
      try {
        await this.transition(order.id, 'PAYOUT_INICIADO', { reason: 'AUTOMATIC_TIMEOUT' });
        // TODO: Llamar al servicio de pagos para iniciar el transfer a Stripe Connect
      } catch (error) {
        console.error(`Error processing auto-release for order ${order.id}:`, error);
      }
    }
  }
}
