import { Router } from 'express';
import { getStripe } from '../lib/stripe';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { EscrowStateMachine } from '../lib/escrow';
import { validate } from '../middleware/validate';
import { createOrderSchema, disputeOrderSchema } from '../schemas/orderSchemas';
import { sendEmail } from '../lib/email';
import { env } from '../config/env';

const router = Router();

import rateLimit from 'express-rate-limit';

const createOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas órdenes creadas. Intenta de nuevo en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de pago. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders — Crear una Orden (DRAFT)
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/', authenticate, createOrderLimiter, validate(createOrderSchema), async (req: any, res: any) => {
  try {
    const clientId = req.user.userId;
    const { professionalId, description, agreedPrice, currency } = req.body;

    if (!professionalId || !description || !agreedPrice) {
      return res.status(400).json({ error: 'Faltan campos requeridos: professionalId, description, agreedPrice' });
    }

    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no encontrado' });
    }

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

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        event: 'DRAFT',
        metadata: { createdBy: clientId },
      },
    });

    // Notificar al profesional (async, no bloquea la respuesta)
    prisma.professional.findUnique({
      where: { id: professionalId },
      include: { user: true }
    }).then(prof => {
      if (prof?.user?.email) {
        prisma.notification.create({
          data: {
            userId: prof.userId,
            type: 'ORDER_STATUS',
            title: 'Nueva orden recibida',
            body: `Tienes una nueva orden de trabajo: "${description.substring(0, 50)}..."`,
            metadata: { orderId: order.id },
          }
        }).catch(console.error);

        sendEmail({
          to: prof.user.email,
          subject: 'Nueva orden recibida — Intecnia',
          html: `
            <h2>¡Tienes una nueva orden!</h2>
            <p>Un cliente ha creado una orden para ti:</p>
            <p><strong>${description.substring(0, 200)}</strong></p>
            <p>Precio acordado: $${agreedPrice} MXN</p>
            <a href="${env.APP_URL}/dashboard">Ver orden en mi dashboard</a>
          `,
        }).catch(console.error);
      }
    }).catch(console.error);

    res.status(201).json({ message: 'Orden creada exitosamente', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error interno al crear la orden' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders/:id/checkout — Generar PaymentIntent de Stripe
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/:id/checkout', authenticate, checkoutLimiter, async (req: any, res: any) => {
  try {
    // FIX: getStripe() aquí es correcto — si no hay key, el checkout no puede proceder
    // y el error se propaga al catch con mensaje claro
    const stripe = getStripe();
    const { id } = req.params;
    const clientId = req.user.userId;

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

    const amountInCents = Math.round(Number(order.agreedPrice) * 100);

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: (order.currency || 'mxn').toLowerCase(),
        metadata: {
          orderId: order.id,
          clientId: order.clientId,
          professionalId: order.professionalId,
        },
        description: `Intecnia Order ${order.id}: ${order.description}`,
      },
      {
        idempotencyKey: `checkout-${order.id}`,
      }
    );

    await EscrowStateMachine.transition(order.id, 'PAGO_PENDIENTE', {
      stripePaymentIntentId: paymentIntent.id,
    });

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
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ error: error.message });
    }
    // FIX: Error claro si Stripe no está configurado
    if (error.message?.includes('STRIPE_SECRET_KEY')) {
      return res.status(503).json({ error: 'Pagos no disponibles en este momento. Contacta al administrador.' });
    }
    res.status(500).json({ error: 'Error interno al procesar el pago' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/my — Mis Ordenes (como cliente o profesional)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/my', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    let orders;
    let total;

    if (role === 'PROFESSIONAL') {
      const professional = await prisma.professional.findUnique({ where: { userId } });
      if (!professional) {
        return res.json({ data: [], total: 0, page, limit });
      }

      [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { professionalId: professional.id },
          include: {
            client: { select: { name: true, avatarUrl: true, email: true } },
            timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.order.count({ where: { professionalId: professional.id } })
      ]);
    } else {
      [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { clientId: userId },
          include: {
            professional: {
              include: { user: { select: { name: true, avatarUrl: true } } }
            },
            timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.order.count({ where: { clientId: userId } })
      ]);
    }

    res.json({
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/complete
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

    if (order.professional.userId !== userId) {
      return res.status(403).json({ error: 'Solo el profesional asignado puede completar esta orden' });
    }

    const updated = await EscrowStateMachine.transition(id, 'COMPLETADO', {
      completedBy: userId,
    });

    res.json({
      message: 'Orden marcada como completada. Los fondos se liberaran en 72 horas.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/start
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/start', authenticate, async (req: any, res: any) => {
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

    if (order.professional.userId !== userId) {
      return res.status(403).json({ error: 'Solo el profesional asignado puede iniciar esta orden' });
    }

    if (order.status !== 'FONDOS_EN_ESCROW') {
      return res.status(400).json({ error: `No se puede iniciar en estado: ${order.status}` });
    }

    const updated = await EscrowStateMachine.transition(id, 'EN_PROGRESO', {
      startedBy: userId,
    });

    res.json({
      message: 'Trabajo iniciado. Los fondos estan en escrow y se liberaran al completar.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error starting order:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/cancel
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/cancel', authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    if (order.clientId !== userId && order.professional.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta orden' });
    }

    if (order.status !== 'DRAFT' && order.status !== 'PAGO_PENDIENTE') {
      return res.status(400).json({ error: `Solo se pueden cancelar órdenes en DRAFT o PAGO_PENDIENTE. Estado actual: ${order.status}` });
    }

    const updated = await EscrowStateMachine.transition(id, 'CANCELADO', {
      cancelledBy: userId,
    });

    res.json({
      message: 'Orden cancelada exitosamente.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/dispute
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/dispute', authenticate, validate(disputeOrderSchema), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    if (order.clientId !== userId) {
      return res.status(403).json({ error: 'Solo el cliente puede abrir una disputa' });
    }

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
      message: 'Disputa abierta exitosamente. Un administrador revisara tu caso.',
      order: updated,
    });
  } catch (error: any) {
    console.error('Error opening dispute:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/orders/:id/resolve — Admin resuelve una disputa
// FIX: Ahora pasa por EscrowStateMachine para mantener consistencia de estados
// ═══════════════════════════════════════════════════════════════════════════════
router.patch('/:id/resolve', authenticate, async (req: any, res: any) => {
  try {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo administradores pueden resolver disputas' });
    }

    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ error: 'El campo resolution es requerido' });
    }

    const validResolutions = ['FAVOR_CLIENT', 'FAVOR_PROFESSIONAL', 'PARTIAL_REFUND', 'TIMEOUT_RELEASE'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ error: `Resolution inválida. Válidas: ${validResolutions.join(', ')}` });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.status !== 'EN_DISPUTA') {
      return res.status(400).json({ error: 'Esta orden no esta en disputa' });
    }

    // FIX: Usar EscrowStateMachine para mantener el audit trail correcto
    // El estado destino depende de la resolución:
    // - FAVOR_CLIENT → REEMBOLSADO (el cliente recupera su dinero)
    // - FAVOR_PROFESSIONAL / PARTIAL_REFUND / TIMEOUT_RELEASE → PAYOUT_INICIADO
    const newStatus = resolution === 'FAVOR_CLIENT' ? 'REEMBOLSADO' : 'PAYOUT_INICIADO';

    await EscrowStateMachine.transition(id, newStatus as any, {
      resolvedBy: user.userId,
      resolution,
    });

    // Actualizar campos de disputa que no maneja el state machine
    const updated = await prisma.order.update({
      where: { id },
      data: {
        disputeResolvedAt: new Date(),
        disputeResolution: resolution,
      }
    });

    // Si la resolución favorece al profesional, ejecutar el payout real
    if (newStatus === 'PAYOUT_INICIADO') {
      EscrowStateMachine.executePayout(id).catch(err =>
        console.error(`Error ejecutando payout post-disputa para orden ${id}:`, err)
      );
    }

    res.json({ message: `Disputa resuelta: ${resolution}`, order: updated });
  } catch (error: any) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/orders/stripe-connect/onboarding
// FIX: Guard contra Stripe no configurado
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/stripe-connect/onboarding', authenticate, async (req: any, res: any) => {
  try {
    // FIX: Guard explícito antes de intentar usar Stripe
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return res.status(503).json({ error: 'Pagos no disponibles en este momento. Contacta al administrador.' });
    }

    const userId = req.user.userId;

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    let stripeAccountId = professional.stripeAccountId;

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

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${req.headers.origin || env.APP_URL}/dashboard?tab=finance&status=refresh`,
      return_url: `${req.headers.origin || env.APP_URL}/dashboard?tab=finance&status=complete`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Error creating Stripe Connect onboarding:', error);
    res.status(500).json({ error: 'Error al generar enlace de Stripe Connect' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/orders/stripe-connect/status
// FIX CRÍTICO: era el bug activo en producción (500 por getStripe() sin catch)
// Ahora responde { connected: false } limpiamente si Stripe no está configurado
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/stripe-connect/status', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const professional = await prisma.professional.findUnique({ where: { userId } });

    // Sin perfil profesional → sin cuenta Stripe
    if (!professional) {
      return res.json({ connected: false, payoutsEnabled: false });
    }

    // Sin stripeAccountId → nunca completó el onboarding
    if (!professional.stripeAccountId) {
      return res.json({ connected: false, payoutsEnabled: false });
    }

    // FIX: Solo llamar getStripe() si hay una cuenta real que consultar.
    // Si Stripe no está configurado, responder con estado base en lugar de 500.
    let stripe;
    try {
      stripe = getStripe();
    } catch {
      console.warn('[Stripe] stripe-connect/status: Stripe no configurado, devolviendo estado base.');
      return res.json({ connected: false, payoutsEnabled: false, stripeConfigured: false });
    }

    const account = await stripe.accounts.retrieve(professional.stripeAccountId);

    // Sincronizar payoutEnabled en BD si cambió en Stripe
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
// GET /api/orders/admin/disputes
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
