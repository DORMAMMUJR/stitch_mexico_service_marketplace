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

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/dispute — Cliente abre una disputa (solo antes de 72h)
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/dispute', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    // Solo el cliente puede abrir una disputa
    if (order.clientId !== userId) {
      return res.status(403).json({ error: 'Solo el cliente puede abrir una disputa' });
    }

    // Solo se puede disputar dentro de las 72h desde que se completó
    if (order.status !== 'COMPLETADO') {
      return res.status(400).json({ error: `No se puede disputar una orden en estado: ${order.status}` });
    }

    if (order.completedAt) {
      const hoursSinceCompleted = (Date.now() - new Date(order.completedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCompleted > 72) {
        return res.status(400).json({ error: 'El plazo de 72 horas para abrir una disputa ha expirado. Los fondos ya fueron liberados.' });
      }
    }

    const updated = await EscrowStateMachine.transition(id, 'EN_DISPUTA', {
      reason: reason || 'Sin motivo especificado',
      disputedBy: userId,
    });

    res.json({
      message: 'Disputa abierta exitosamente. Un administrador revisará tu caso.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error opening dispute:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/resolve — Admin resuelve una disputa
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/resolve', authenticate, async (req: any, res: any) => {
  try {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden resolver disputas' });
    }

    const { id } = req.params;
    const { resolution } = req.body; // 'FAVOR_CLIENT' | 'FAVOR_PROFESSIONAL' | 'PARTIAL_REFUND'

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'EN_DISPUTA') {
      return res.status(400).json({ error: 'Esta orden no está en disputa' });
    }

    let newStatus: any;
    if (resolution === 'FAVOR_CLIENT') {
      newStatus = 'REEMBOLSADO';
    } else {
      newStatus = 'PAYOUT_INICIADO';
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: newStatus,
        disputeResolvedAt: new Date(),
        disputeResolution: resolution,
      }
    });

    // Registrar evento
    await prisma.orderEvent.create({
      data: {
        orderId: id,
        event: `DISPUTE_RESOLVED_${resolution}`,
        metadata: { resolvedBy: user.userId, resolution },
      }
    });

    res.json({
      message: `Disputa resuelta: ${resolution}`,
      order: updated,
    });
  } catch (error: any) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders/stripe-connect/onboarding — Generar link de Stripe Connect
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/stripe-connect/onboarding', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    let stripeAccountId = professional.stripeAccountId;

    // Si no tiene cuenta de Stripe, crear una
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        metadata: { professionalId: professional.id, userId },
      });

      stripeAccountId = account.id;

      await prisma.professional.update({
        where: { id: professional.id },
        data: { stripeAccountId },
      });
    }

    // Generar link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${req.headers.origin || 'http://localhost:5173'}/dashboard?tab=finance&status=refresh`,
      return_url: `${req.headers.origin || 'http://localhost:5173'}/dashboard?tab=finance&status=complete`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Error creating Stripe Connect onboarding:', error);
    res.status(500).json({ error: 'Error al generar enlace de Stripe Connect' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/stripe-connect/status — Estado de la cuenta Stripe
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stripe-connect/status', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const professional = await prisma.professional.findUnique({ where: { userId } });

    if (!professional) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    if (!professional.stripeAccountId) {
      return res.json({ connected: false, payoutsEnabled: false });
    }

    const account = await stripe.accounts.retrieve(professional.stripeAccountId);

    // Actualizar payoutEnabled si cambió
    if (account.payouts_enabled !== professional.payoutEnabled) {
      await prisma.professional.update({
        where: { id: professional.id },
        data: { payoutEnabled: account.payouts_enabled || false },
      });
    }

    res.json({
      connected: true,
      payoutsEnabled: account.payouts_enabled || false,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
    });
  } catch (error: any) {
    console.error('Error checking Stripe Connect status:', error);
    res.status(500).json({ error: 'Error al verificar estado de Stripe' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/admin/disputes — Admin: listar órdenes en disputa
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/admin/disputes', authenticate, async (req: any, res: any) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const disputes = await prisma.order.findMany({
      where: { status: 'EN_DISPUTA' },
      include: {
        client: { select: { name: true, email: true } },
        professional: {
          include: { user: { select: { name: true, email: true } } }
        },
        timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { disputeOpenedAt: 'desc' },
    });

    res.json(disputes);
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export { router as ordersRouter };
