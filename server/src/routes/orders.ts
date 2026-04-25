import { Router } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { EscrowStateMachine } from '../lib/escrow';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders — Crear una Orden (DRAFT)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, async (req: any, res: any) => {
  try {
    const clientId = req.user.userId;
    const { professionalId, description, agreedPrice, currency } = req.body;

    if (!professionalId || !description || !agreedPrice) {
      return res.status(400).json({ error: 'Faltan campos requeridos: professionalId, description, agreedPrice' });
    }

    // Verificar que el profesional existe
    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

    // No permitir auto-contratación
    if (professional.userId === clientId) {
      return res.status(400).json({ error: 'No puedes crear una orden para ti mismo' });
    }

    const order = await prisma.order.create({
      data: {
        clientId,
        professionalId,
        description,
        agreedPrice: parseFloat(agreedPrice),
        currency: currency || 'MXN',
        status: 'DRAFT',
      },
    });

    // Registrar evento de creación
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        event: 'DRAFT',
        metadata: { createdBy: clientId },
      },
    });

    res.status(201).json({
      message: 'Orden creada exitosamente',
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error interno al crear la orden' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders/:id/checkout — Generar PaymentIntent de Stripe
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/checkout', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const clientId = req.user.userId;

    // Buscar la orden y verificar que pertenece al cliente
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (order.clientId !== clientId) {
      return res.status(403).json({ error: 'No tienes permiso para pagar esta orden' });
    }

    if (order.status !== 'DRAFT' && order.status !== 'PAGO_PENDIENTE') {
      return res.status(400).json({ error: `No se puede iniciar checkout en estado: ${order.status}` });
    }

    // Crear PaymentIntent en Stripe
    const amountInCents = Math.round(Number(order.agreedPrice) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: (order.currency || 'mxn').toLowerCase(),
      metadata: {
        orderId: order.id,
        clientId: order.clientId,
        professionalId: order.professionalId,
      },
      description: `Intecnia Order ${order.id}: ${order.description}`,
    });

    // Transicionar la orden a PAGO_PENDIENTE
    await EscrowStateMachine.transition(order.id, 'PAGO_PENDIENTE', {
      stripePaymentIntentId: paymentIntent.id,
    });

    // Guardar el PaymentIntent ID en la orden
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: paymentIntent.id },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Error in checkout:', error);
    // Si es un error de Stripe, devolver mensaje legible
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error interno al procesar el pago' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/my — Mis Órdenes (como cliente o profesional)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/my', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let orders;

    if (role === 'PROFESSIONAL') {
      // Buscar el perfil profesional del usuario
      const professional = await prisma.professional.findUnique({ where: { userId } });
      if (!professional) {
        return res.json([]);
      }

      orders = await prisma.order.findMany({
        where: { professionalId: professional.id },
        include: {
          client: { select: { name: true, avatarUrl: true, email: true } },
          timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { clientId: userId },
        include: {
          professional: {
            include: { user: { select: { name: true, avatarUrl: true } } }
          },
          timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/complete — Profesional marca orden como completada
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/complete', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Solo el profesional asignado puede completar
    if (order.professional.userId !== userId) {
      return res.status(403).json({ error: 'Solo el profesional asignado puede completar esta orden' });
    }

    const updated = await EscrowStateMachine.transition(id, 'COMPLETADO', {
      completedBy: userId,
    });

    res.json({
      message: 'Orden marcada como completada. Los fondos se liberarán en 72 horas.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

export { router as ordersRouter };
