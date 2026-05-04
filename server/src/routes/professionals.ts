import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { uploadPublicImage } from '../lib/upload';
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
      // El registro Professional aún no existe (transición CLIENT→PROFESSIONAL en curso)
      // Devolver dashboard base con métricas en cero para no bloquear el acceso
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, avatarUrl: true } });
      return res.json({
        profileViews: 0,
        profileViewsGrowth: '0%',
        totalInteractions: 0,
        conversionRate: '0%',
        automatedMessages: 0,
        appointmentsScheduled: 0,
        verificationStatus: 'PENDING',
        user: {
          name: user?.name || 'Profesional',
          title: '',
          avatarUrl: user?.avatarUrl || null,
          isVerified: false,
        }
      });
    }

    const completedOrders = professional.orders.filter(o => o.status === 'COMPLETADO');
    const totalNonDraftOrders = professional.orders.filter(o => !['DRAFT', 'CANCELADO'].includes(o.status)).length;
    const totalEarnings = completedOrders.reduce((acc, o) => acc + Number(o.agreedPrice), 0);

    // Métricas reales calculadas
    // Vista de perfil podría requerir una tabla PageViews, mientras usamos un valor conservador:
    const profileViews = Math.round(completedOrders.length * 2.5) + totalNonDraftOrders;

    // Total de interacciones = mensajes (citas agendadas) + disputas o resoluciones
    const totalInteractions = professional.appointments.length + professional.orders.length;

    // Tasa de conversión = Órdenes Completadas / Total de Órdenes que salieron de DRAFT
    const conversionRateStr = totalNonDraftOrders > 0
      ? `${Math.round((completedOrders.length / totalNonDraftOrders) * 100)}%`
      : '0%';

    res.json({
      profileViews: profileViews,
      profileViewsGrowth: null, // Se implementará con tabla PageViews en iteración futura
      totalInteractions: totalInteractions,
      conversionRate: conversionRateStr,
      automatedMessages: professional.appointments.length, // Un mensaje automatizado por cita
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
      include: {
        user: { select: { name: true, avatarUrl: true, email: true } },
        documents: true,
        portfolioItems: { orderBy: { createdAt: 'desc' } }
      }
    });
    // Si no existe el perfil profesional, devolver un objeto base en lugar de 404
    // para que VerificationPage y DashboardPage puedan inicializar sus estados
    if (!professional) {
      return res.json({
        id: null,
        userId: req.user.userId,
        title: '',
        bio: null,
        category: 'GENERAL_MAINTENANCE',
        hourlyRate: null,
        isVerified: false,
        verificationStatus: 'PENDING',
        documents: [],
        portfolioItems: [],
        user: null,
        _notCreated: true, // Flag para que el frontend sepa que debe crear el registro
      });
    }
    res.json(professional);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// POST /api/professionals/me/ensure (Inicializar perfil profesional si no existe)
// Llamado por VerificationPage cuando un CLIENT quiere convertirse en PROFESSIONAL
router.post('/me/ensure', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    // Verificar si ya existe
    const existing = await prisma.professional.findUnique({ where: { userId } });
    if (existing) {
      return res.json({ message: 'Perfil ya existe', professional: existing, created: false });
    }

    // Actualizar rol del usuario a PROFESSIONAL
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PROFESSIONAL' }
    });

    // Crear registro Professional con valores por defecto
    const professional = await prisma.professional.create({
      data: {
        userId,
        title: '',
        category: 'GENERAL_MAINTENANCE',
        currency: 'MXN',
      }
    });

    res.status(201).json({ message: 'Perfil profesional creado', professional, created: true });
  } catch (error) {
    console.error('Error en /me/ensure:', error);
    res.status(500).json({ error: 'Error al inicializar perfil profesional' });
  }
});

// PUT /api/professionals/me (Actualizar o crear perfil — upsert)
router.put('/me', authenticate, async (req: any, res) => {
  try {
    const { title, category, bio, hourlyRate } = req.body;
    const userId = req.user.userId;

    // 1. Buscar si ya existe (puede no existir si el usuario era CLIENT)
    const professional = await prisma.professional.findUnique({
      where: { userId }
    });

    // Si no existe, crearlo (upsert manual para poder comparar campos críticos)
    if (!professional) {
      // Actualizar rol a PROFESSIONAL en la tabla User
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'PROFESSIONAL' }
      });

      const newProfessional = await prisma.professional.create({
        data: {
          userId,
          title: title || '',
          category: (category as any) || 'GENERAL_MAINTENANCE',
          bio: bio || null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          currency: 'MXN',
        }
      });
      return res.status(201).json({
        message: 'Perfil profesional creado exitosamente',
        profile: newProfessional,
        requiresReview: false,
      });
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

// POST /api/professionals/me/submit-review (Enviar perfil a revisión)
router.post('/me/submit-review', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const professional = await prisma.professional.findUnique({
      where: { userId },
      include: { documents: true }
    });

    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    // Ahora INE y SAT son opcionales para reducir fricción en el registro.
    // Solo se actualiza el estado a IN_REVIEW.

    const updatedProfile = await prisma.professional.update({
      where: { userId },
      data: { verificationStatus: 'IN_REVIEW' }
    });

    res.json({ message: 'Perfil enviado a revisión', profile: updatedProfile });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PORTAFOLIOS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/professionals/me/portfolio (Subir imagen)
router.post('/me/portfolio', authenticate, uploadPublicImage.single('image'), async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const file = req.file as any;

    if (!file) return res.status(400).json({ error: 'No se subió ninguna imagen' });

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    const fileUrl = file.location || `/uploads/${file.filename}`;

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        professionalId: professional.id,
        imageUrl: fileUrl,
      }
    });

    res.status(201).json({ message: 'Imagen subida al portafolio', portfolioItem });
  } catch (error) {
    console.error('Error uploading portfolio item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/professionals/me/portfolio/:itemId (Eliminar imagen)
router.delete('/me/portfolio/:itemId', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    const item = await prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: 'Imagen no encontrada' });
    if (item.professionalId !== professional.id) return res.status(403).json({ error: 'Acceso denegado' });

    await prisma.portfolioItem.delete({ where: { id: itemId } });

    res.json({ message: 'Imagen eliminada del portafolio' });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
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
        user: { select: { name: true, avatarUrl: true } },
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
        portfolioItems: { orderBy: { createdAt: 'desc' } },
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
      // Datos de precios y categoría — necesarios para la UI del perfil
      hourlyRate: professional.hourlyRate ? Number(professional.hourlyRate) : null,
      currency: professional.currency || 'MXN',
      category: professional.category,
      portfolioItems: professional.portfolioItems,
    });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as professionalsRouter };
