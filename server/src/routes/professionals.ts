import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { CRITICAL_FIELDS } from '../constants/verificationFields';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RUTAS ESTÁTICAS Y PROTEGIDAS PRIMERO (Regla de oro de Express)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/professionals/me/dashboard
router.get('/me/dashboard', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const professional = await prisma.professional.findUnique({
      where: { userId },
      include: {
        orders: true,
        user: true,
        appointments: true,
      }
    });

    if (!professional) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    const completedOrders = professional.orders.filter(o => o.status === 'COMPLETADO');
    const totalNonDraftOrders = professional.orders.filter(o => !['DRAFT', 'CANCELADO'].includes(o.status)).length;
    const totalEarnings = completedOrders.reduce((acc, o) => acc + Number(o.agreedPrice), 0);

    res.json({
      profileViews: 0,
      profileViewsGrowth: '0%',
      totalInteractions: completedOrders.length * 15,
      conversionRate: totalNonDraftOrders > 0 ? `${Math.round((completedOrders.length / totalNonDraftOrders) * 100)}%` : '0%',
      automatedMessages: professional.appointments.length * 3,
      appointmentsScheduled: professional.appointments.length,
      verificationStatus: professional.verificationStatus,
      user: {
        name: professional.user.name,
        title: professional.title,
        avatarUrl: professional.user.avatarUrl,
        isVerified: professional.isVerified,
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/professionals/me (Perfil editable del profesional autenticado)
router.get('/me', authenticate, async (req: any, res: any) => {
  try {
    const professional = await prisma.professional.findUnique({
      where: { userId: req.user.userId },
      include: { user: { select: { name: true, avatarUrl: true, email: true } } }
    });
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json(professional);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/professionals/me (Actualizar perfil)
router.put('/me', authenticate, async (req: any, res) => {
  try {
    const { title, category, bio, hourlyRate } = req.body;
    const userId = req.user.userId;

    // 1. Verificar que el profesional existe
    const professional = await prisma.professional.findUnique({
      where: { userId }
    });

    if (!professional) {
      return res.status(404).json({ error: 'Perfil profesional no encontrado' });
    }

    // 2. Detectar si hay cambios en campos críticos
    const incomingData: any = { title, category, bio, hourlyRate };
    let criticalChanged = false;

    for (const field of CRITICAL_FIELDS) {
      const newVal = incomingData[field];
      if (newVal !== undefined && newVal !== (professional as any)[field]) {
        criticalChanged = true;
        break;
      }
    }

    // 3. Preparar datos de actualización
    const updateData: any = {
      title: title || professional.title,
      category: category || professional.category,
      bio: bio !== undefined ? bio : professional.bio,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : professional.hourlyRate,
    };

    // 4. Si cambió un campo crítico y estaba verificado, resetear verificación
    if (criticalChanged && professional.isVerified) {
      updateData.verificationStatus = 'IN_REVIEW';
      updateData.isVerified = false;
    }

    const updatedProfile = await prisma.professional.update({
      where: { userId },
      data: updateData
    });

    res.json({ 
      message: criticalChanged && professional.isVerified
        ? 'Perfil actualizado. Se requiere re-verificación por cambios en campos críticos.'
        : 'Perfil actualizado exitosamente', 
      profile: updatedProfile,
      requiresReview: criticalChanged && professional.isVerified,
    });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: 'Error interno al actualizar el perfil' });
  }
});

// GET /api/professionals/me/availability (Obtener horarios)
router.get('/me/availability', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const professional = await prisma.professional.findUnique({ where: { userId } });
    
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    const availabilities = await prisma.availability.findMany({
      where: { professionalId: professional.id },
      orderBy: { dayOfWeek: 'asc' }
    });

    res.json(availabilities);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/professionals/me/availability (Actualizar horarios)
router.put('/me/availability', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const availabilities = req.body.availabilities; // Array de objetos { dayOfWeek, startTime, endTime }

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar disponibilidades anteriores
      await tx.availability.deleteMany({
        where: { professionalId: professional.id }
      });

      // 2. Insertar las nuevas disponibilidades
      if (availabilities && availabilities.length > 0) {
        await tx.availability.createMany({
          data: availabilities.map((a: any) => ({
            professionalId: professional.id,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime
          }))
        });
      }
    });

    res.json({ message: 'Horarios actualizados exitosamente' });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 2. DIRECTORIO DINÁMICO (Buscador real con filtros)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/professionals
router.get('/', async (req, res) => {
  try {
    const { category, q, maxPrice, minRating } = req.query;

    // Construir los filtros dinámicamente
    const whereClause: any = {
      isVerified: true, // Solo mostramos verificados en el directorio
    };

    if (category) {
      whereClause.category = String(category);
    }

    if (q) {
      const searchTerm = String(q);
      whereClause.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } }
      ];
    }

    if (maxPrice) {
      whereClause.hourlyRate = { ...(whereClause.hourlyRate || {}), lte: parseFloat(String(maxPrice)) };
    }

    const professionals = await prisma.professional.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, avatarUrl: true, phone: true } },
        reviews: { select: { rating: true } }
      },
      take: 20 // Paginación básica
    });

    // Formatear la respuesta para el frontend
    const formatted = professionals.map(p => {
      const rating = p.reviews.length > 0
        ? (p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length).toFixed(1)
        : "5.0";

      return {
        id: p.id,
        name: p.user.name,
        phone: p.user.phone,
        avatarUrl: p.user.avatarUrl,
        title: p.title,
        category: p.category,
        hourlyRate: p.hourlyRate,
        rating: rating,
        reviewCount: p.reviews.length
      };
    });

    // Filtrar por calificación mínima (post-query ya que es un cálculo derivado)
    let results = formatted;
    if (minRating) {
      const minR = parseFloat(String(minRating));
      results = results.filter((p: any) => parseFloat(p.rating) >= minR);
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching directory:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// 3. RUTAS CON PARÁMETROS DINÁMICOS AL FINAL
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/professionals/:id/reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await prisma.review.findMany({
      where: { professionalId: id },
      include: {
        author: {
          select: { name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formatted = reviews.map(r => ({
      id: r.id,
      name: r.author.name,
      avatarUrl: r.author.avatarUrl,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/professionals/:id (Perfil Público)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.query.clientId as string | undefined;

    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        user: true,
        reviews: true,
        orders: true,
      },
    });

    if (!professional) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    // Filtro isVerified: solo mostrar perfiles verificados al público
    // EXCEPCIÓN: el dueño puede ver su propio perfil no verificado
    const isOwner = clientId && professional.userId === clientId;
    if (!professional.isVerified && !isOwner) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    const completedOrders = professional.orders.filter((o: any) => o.status === 'COMPLETADO');
    const totalNonDraftOrders = professional.orders.filter(
      (o: any) => !['DRAFT', 'CANCELADO'].includes(o.status)
    );

    const totalReviews = professional.reviews.length;
    const avgRating = totalReviews > 0
      ? professional.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews
      : 5.0;

    const yearsActive = Math.max(
      1,
      Math.floor((Date.now() - professional.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
    );

    const successRate = totalNonDraftOrders.length > 0
      ? Math.round((completedOrders.length / totalNonDraftOrders.length) * 100)
      : 98;

    let phoneVisible: string | null = null;
    if (clientId) {
      const escrowOrder = await prisma.order.findFirst({
        where: {
          professionalId: id,
          clientId,
          status: {
            in: ['FONDOS_EN_ESCROW', 'EN_PROGRESO', 'COMPLETADO', 'PAYOUT_INICIADO', 'PAYOUT_COMPLETADO'],
          },
        },
      });
      if (escrowOrder) {
        phoneVisible = professional.user?.phone || null;
      }
    }

    res.json({
      id: professional.id,
      name: professional.user?.name || 'Profesional Certificado',
      phone: phoneVisible,
      avatarUrl: professional.user?.avatarUrl,
      title: professional.title,
      bio: professional.bio,
      isVerified: professional.isVerified,
      biometricDone: professional.biometricDone,
      satVerifiedAt: professional.satVerifiedAt,
      yearsExp: `${yearsActive}+`,
      projectsCount: `${completedOrders.length}`,
      successRate: `${successRate}%`,
      rating: avgRating.toFixed(1),
      reviewCount: totalReviews,
    });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as professionalsRouter };
