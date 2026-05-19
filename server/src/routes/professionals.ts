import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { uploadPublicImage } from '../lib/upload';
import {
  CRITICAL_FIELDS,
  DEFAULT_PROFESSIONAL_CATEGORY,
  PROFESSIONAL_CATEGORIES,
  normalizeProfessionalCategory,
} from '../constants/verificationFields';
import { resolveSymptomToSpecialty } from '../lib/clinicalCatalog';

const router = Router();

const MEDICAL_SPECIALTIES = new Set([
  'MEDICINA_GENERAL',
  'PEDIATRIA',
  'GINECOLOGIA',
  'TRAUMATOLOGIA',
  'ORTOPEDIA',
  'DERMATOLOGIA',
  'PSIQUIATRIA',
  'PSICOLOGIA',
  'CARDIOLOGIA',
  'ODONTOLOGIA',
  'NUTRICION',
  'MEDICINA_INTERNA',
]);

const CONSULTATION_MODES = new Set(['PRESENCIAL', 'DOMICILIO', 'TELEMEDICINA']);
const INSURANCE_PROVIDERS = new Set(['GNP', 'AXA', 'METLIFE', 'MAPFRE', 'ALLIANZ', 'BBVA', 'INBURSA', 'QUALITAS', 'PLAN_PRIVADO']);
const HEALTH_CATEGORIES = new Set(PROFESSIONAL_CATEGORIES);
const MEDICAL_SPECIALTY_FILTERS = new Set(['PSICOLOGIA', 'PSIQUIATRIA', 'MEDICINA_GENERAL', 'MEDICINA_INTERNA', 'PEDIATRIA', 'GINECOLOGIA', 'TRAUMATOLOGIA', 'ORTOPEDIA', 'DERMATOLOGIA', 'CARDIOLOGIA', 'ODONTOLOGIA', 'NUTRICION']);

function normalizeArrayInput(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((value) => String(value).trim()).filter(Boolean);
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTextInput(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return value || null;
}

function normalizeMoneyInput(input: unknown): number | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  const value = Number(input);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

function normalizeIntegerInput(input: unknown): number | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  const value = Number(input);
  return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
}

function normalizeSearchTerm(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function resolveSearchSpecialty(input: string): string | null {
  const normalized = normalizeSearchTerm(input);
  if (!normalized) return null;
  if (normalized.includes('psicolog')) return 'PSICOLOGIA';
  if (normalized.includes('psiquiatr')) return 'PSIQUIATRIA';
  if (normalized.includes('nutric')) return 'NUTRICION';
  if (normalized.includes('pediatr')) return 'PEDIATRIA';
  if (normalized.includes('ginecolog')) return 'GINECOLOGIA';
  if (normalized.includes('traumatolog')) return 'TRAUMATOLOGIA';
  if (normalized.includes('ortoped')) return 'ORTOPEDIA';
  if (normalized.includes('dermatolog')) return 'DERMATOLOGIA';
  if (normalized.includes('cardiolog')) return 'CARDIOLOGIA';
  if (normalized.includes('odontolog')) return 'ODONTOLOGIA';
  if (normalized.includes('medicina interna')) return 'MEDICINA_INTERNA';
  if (normalized.includes('medicina') || normalized.includes('general')) return 'MEDICINA_GENERAL';
  return null;
}

function buildPriceFilter(minPrice: unknown, maxPrice: unknown) {
  const min = minPrice ? parseFloat(String(minPrice)) : null;
  const max = maxPrice ? parseFloat(String(maxPrice)) : null;
  const range: any = {};

  if (Number.isFinite(min)) range.gte = min;
  if (Number.isFinite(max)) range.lte = max;
  if (!range.gte && !range.lte) return null;

  return {
    OR: [
      { hourlyRate: range },
      { presencialRate: range },
      { telemedicineRate: range },
      { homeVisitRate: range },
    ],
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. RUTAS ESTÃTICAS Y PROTEGIDAS PRIMERO (Regla de oro de Express)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET /api/professionals/me/dashboard
router.get('/me/dashboard', authenticate, async (req: any, res: any, next: any) => {
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
      // El registro Professional aÃºn no existe (transiciÃ³n CLIENTâ†’PROFESSIONAL en curso)
      // Devolver dashboard base con mÃ©tricas en cero para no bloquear el acceso
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
    const totalMessages = await prisma.message.count({
      where: {
        OR: [{ senderId: professional.userId }, { receiverId: professional.userId }],
      },
    });

    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const startCurrent = new Date(now.getTime() - THIRTY_DAYS_MS);
    const startPrevious = new Date(now.getTime() - 2 * THIRTY_DAYS_MS);

    const [currentViews, previousViews] = await Promise.all([
      prisma.profileView.count({
        where: {
          professionalId: professional.id,
          createdAt: { gte: startCurrent },
        },
      }),
      prisma.profileView.count({
        where: {
          professionalId: professional.id,
          createdAt: { gte: startPrevious, lt: startCurrent },
        },
      }),
    ]);

    const profileViews = currentViews;
    const growthPercent = previousViews > 0
      ? Math.round(((currentViews - previousViews) / previousViews) * 100)
      : currentViews > 0
        ? 100
        : 0;

    // Total de interacciones = mensajes (citas agendadas) + disputas o resoluciones
    const totalInteractions = professional.appointments.length + professional.orders.length;

    // Tasa de conversiÃ³n = Ã“rdenes Completadas / Total de Ã“rdenes que salieron de DRAFT
    const conversionRateStr = totalNonDraftOrders > 0
      ? `${Math.round((completedOrders.length / totalNonDraftOrders) * 100)}%`
      : '0%';

    res.json({
      profileViews: profileViews,
      profileViewsGrowth: `${growthPercent >= 0 ? '+' : ''}${growthPercent}%`,
      totalInteractions: totalInteractions,
      conversionRate: conversionRateStr,
      automatedMessages: totalMessages,
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
    next(error);
  }
});

// GET /api/professionals/me (Perfil editable del profesional autenticado)
router.get('/me', authenticate, async (req: any, res: any, next: any) => {
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
        category: DEFAULT_PROFESSIONAL_CATEGORY,
        medicalSpecialty: null,
        consultationModes: [],
        treatedConditions: [],
        acceptedInsurers: [],
        officeAddress: null,
        experienceYears: null,
        certifications: [],
        associations: [],
        emergencyDisclaimerAccepted: false,
        serviceAreas: [],
        languages: [],
        slotIntervalMinutes: 30,
        presencialRate: null,
        telemedicineRate: null,
        homeVisitRate: null,
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
    next(error);
  }
});

// POST /api/professionals/me/ensure (Inicializar perfil profesional si no existe)
// Llamado por VerificationPage cuando un CLIENT quiere convertirse en PROFESSIONAL
router.post('/me/ensure', authenticate, async (req: any, res: any, next: any) => {
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
        category: DEFAULT_PROFESSIONAL_CATEGORY,
        slotIntervalMinutes: 30,
        currency: 'MXN',
      }
    });

    res.status(201).json({ message: 'Perfil profesional creado', professional, created: true });
  } catch (error) {
    next(error);
  }
});

// PUT /api/professionals/me (Actualizar o crear perfil â€” upsert)
router.put('/me', authenticate, async (req: any, res, next) => {
  try {
    const {
      title,
      category,
      bio,
      hourlyRate,
      medicalSpecialty,
      treatedConditions,
      consultationModes,
      officeAddress,
      experienceYears,
      certifications,
      associations,
      emergencyDisclaimerAccepted,
      serviceAreas,
      languages,
      acceptedInsurers,
      slotIntervalMinutes,
      presencialRate,
      telemedicineRate,
      homeVisitRate,
    } = req.body;
    const userId = req.user.userId;
    const normalizedCategory = normalizeProfessionalCategory(category);
    const normalizedConsultationModes = normalizeArrayInput(consultationModes).map((value) => value.toUpperCase());
    const normalizedTreatedConditions = normalizeArrayInput(treatedConditions);
    const normalizedOfficeAddress = normalizeTextInput(officeAddress);
    const normalizedExperienceYears = normalizeIntegerInput(experienceYears);
    const normalizedCertifications = normalizeArrayInput(certifications);
    const normalizedAssociations = normalizeArrayInput(associations);
    const normalizedEmergencyDisclaimerAccepted = emergencyDisclaimerAccepted === true || emergencyDisclaimerAccepted === 'true';
    const normalizedServiceAreas = normalizeArrayInput(serviceAreas);
    const normalizedLanguages = normalizeArrayInput(languages);
    const normalizedInsurers = normalizeArrayInput(acceptedInsurers).map((value) => value.toUpperCase());
    const normalizedMedicalSpecialty = medicalSpecialty ? String(medicalSpecialty).trim().toUpperCase() : null;
    const normalizedSlotInterval = slotIntervalMinutes !== undefined ? Number(slotIntervalMinutes) : undefined;
    const normalizedPresencialRate = normalizeMoneyInput(presencialRate);
    const normalizedTelemedicineRate = normalizeMoneyInput(telemedicineRate);
    const normalizedHomeVisitRate = normalizeMoneyInput(homeVisitRate);

    if (normalizedMedicalSpecialty && !MEDICAL_SPECIALTIES.has(normalizedMedicalSpecialty)) {
      return res.status(400).json({ error: 'medicalSpecialty invalida' });
    }
    if (!normalizedCategory) {
      return res.status(400).json({ error: 'Categoria invalida. Usa Psicologia, Medicina o Bienestar.' });
    }

    if (normalizedConsultationModes.some((mode) => !CONSULTATION_MODES.has(mode))) {
      return res.status(400).json({ error: 'consultationModes contiene valores invalidos' });
    }

    if (normalizedInsurers.some((provider) => !INSURANCE_PROVIDERS.has(provider))) {
      return res.status(400).json({ error: 'acceptedInsurers contiene valores invalidos' });
    }

    if (normalizedSlotInterval !== undefined && ![20, 30, 45].includes(normalizedSlotInterval)) {
      return res.status(400).json({ error: 'slotIntervalMinutes debe ser 20, 30 o 45' });
    }

    if ([normalizedPresencialRate, normalizedTelemedicineRate, normalizedHomeVisitRate].some((value) => Number.isNaN(value))) {
      return res.status(400).json({ error: 'Los precios por tipo de consulta deben ser numeros validos' });
    }

    if (Number.isNaN(normalizedExperienceYears)) {
      return res.status(400).json({ error: 'experienceYears debe ser un numero entero valido' });
    }

    // 1. Buscar si ya existe (puede no existir si el usuario era CLIENT)
    const professional = await prisma.professional.findUnique({
      where: { userId }
    });

    // Si no existe, crearlo (upsert manual para poder comparar campos crÃ­ticos)
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
          category: normalizedCategory as any,
          medicalSpecialty: normalizedMedicalSpecialty as any,
          treatedConditions: normalizedTreatedConditions,
          consultationModes: normalizedConsultationModes as any,
          officeAddress: normalizedOfficeAddress,
          experienceYears: normalizedExperienceYears ?? null,
          certifications: normalizedCertifications,
          associations: normalizedAssociations,
          emergencyDisclaimerAccepted: normalizedEmergencyDisclaimerAccepted,
          serviceAreas: normalizedServiceAreas,
          languages: normalizedLanguages,
          acceptedInsurers: normalizedInsurers as any,
          slotIntervalMinutes: normalizedSlotInterval || 30,
          presencialRate: normalizedPresencialRate ?? null,
          telemedicineRate: normalizedTelemedicineRate ?? null,
          homeVisitRate: normalizedHomeVisitRate ?? null,
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

    // 2. Detectar si hay cambios en campos crÃ­ticos
    const incomingData: any = {
      title,
      category: normalizedCategory,
      bio,
      hourlyRate,
      medicalSpecialty,
      treatedConditions: normalizedTreatedConditions,
      consultationModes: normalizedConsultationModes,
      officeAddress: normalizedOfficeAddress,
      experienceYears: normalizedExperienceYears,
      certifications: normalizedCertifications,
      associations: normalizedAssociations,
      emergencyDisclaimerAccepted: normalizedEmergencyDisclaimerAccepted,
      serviceAreas: normalizedServiceAreas,
      languages: normalizedLanguages,
      acceptedInsurers: normalizedInsurers,
      slotIntervalMinutes: normalizedSlotInterval,
      presencialRate: normalizedPresencialRate,
      telemedicineRate: normalizedTelemedicineRate,
      homeVisitRate: normalizedHomeVisitRate,
    };
    let criticalChanged = false;

    for (const field of CRITICAL_FIELDS) {
      const newVal = incomingData[field];
      if (newVal !== undefined && newVal !== (professional as any)[field]) {
        criticalChanged = true;
        break;
      }
    }

    // 3. Preparar datos de actualizaciÃ³n
    const updateData: any = {
      title: title || professional.title,
      category: normalizedCategory as any,
      medicalSpecialty: normalizedMedicalSpecialty !== null ? (normalizedMedicalSpecialty as any) : professional.medicalSpecialty,
      treatedConditions: treatedConditions !== undefined ? normalizedTreatedConditions : professional.treatedConditions,
      consultationModes: normalizedConsultationModes.length > 0 ? (normalizedConsultationModes as any) : professional.consultationModes,
      officeAddress: officeAddress !== undefined ? normalizedOfficeAddress : professional.officeAddress,
      experienceYears: experienceYears !== undefined ? normalizedExperienceYears : professional.experienceYears,
      certifications: certifications !== undefined ? normalizedCertifications : professional.certifications,
      associations: associations !== undefined ? normalizedAssociations : professional.associations,
      emergencyDisclaimerAccepted: emergencyDisclaimerAccepted !== undefined ? normalizedEmergencyDisclaimerAccepted : professional.emergencyDisclaimerAccepted,
      serviceAreas: serviceAreas !== undefined ? normalizedServiceAreas : professional.serviceAreas,
      languages: languages !== undefined ? normalizedLanguages : professional.languages,
      acceptedInsurers: normalizedInsurers.length > 0 ? (normalizedInsurers as any) : professional.acceptedInsurers,
      slotIntervalMinutes: normalizedSlotInterval || professional.slotIntervalMinutes || 30,
      presencialRate: normalizedPresencialRate !== undefined ? normalizedPresencialRate : professional.presencialRate,
      telemedicineRate: normalizedTelemedicineRate !== undefined ? normalizedTelemedicineRate : professional.telemedicineRate,
      homeVisitRate: normalizedHomeVisitRate !== undefined ? normalizedHomeVisitRate : professional.homeVisitRate,
      bio: bio !== undefined ? bio : professional.bio,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : professional.hourlyRate,
    };

    // 4. Si cambiÃ³ un campo crÃ­tico y estaba verificado, resetear verificaciÃ³n
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
        ? 'Perfil actualizado. Se requiere re-verificaciÃ³n por cambios en campos crÃ­ticos.'
        : 'Perfil actualizado exitosamente',
      profile: updatedProfile,
      requiresReview: criticalChanged && professional.isVerified,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/professionals/me/submit-review (Enviar perfil a revisiÃ³n)
router.post('/me/submit-review', authenticate, async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.userId;

    const professional = await prisma.professional.findUnique({
      where: { userId },
      include: { documents: true }
    });

    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    const hasIne = professional.documents.some((doc) => (
      doc.type === 'INE' && (doc.status === 'PENDING' || doc.status === 'APPROVED')
    ));
    const hasCedula = professional.documents.some((doc) => (
      doc.type === 'CONOCER_CERT' && (doc.status === 'PENDING' || doc.status === 'APPROVED')
    ));

    if (!hasIne || !hasCedula) {
      return res.status(400).json({ error: 'Debes subir INE y Cédula profesional antes de enviar tu perfil a revisión.' });
    }

    const updatedProfile = await prisma.professional.update({
      where: { userId },
      data: { verificationStatus: 'IN_REVIEW', isVerified: false }
    });

    res.json({ message: 'Perfil enviado a revisiÃ³n', profile: updatedProfile });
  } catch (error) {
    next(error);
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PORTAFOLIOS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// POST /api/professionals/me/portfolio (Subir imagen)
router.post('/me/portfolio', authenticate, uploadPublicImage.single('image'), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.userId;
    const file = req.file as any;

    if (!file) return res.status(400).json({ error: 'No se subiÃ³ ninguna imagen' });

    const professional = await prisma.professional.findUnique({ where: { userId } });
    if (!professional) return res.status(404).json({ error: 'Perfil no encontrado' });

    const fileUrl = file.location || `/uploads/public/${file.filename}`;

    const portfolioItem = await prisma.portfolioItem.create({
      data: {
        professionalId: professional.id,
        imageUrl: fileUrl,
      }
    });

    res.status(201).json({ message: 'Imagen subida al portafolio', portfolioItem });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/professionals/me/portfolio/:itemId (Eliminar imagen)
router.delete('/me/portfolio/:itemId', authenticate, async (req: any, res: any, next: any) => {
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
    next(error);
  }
});

// GET /api/professionals/me/availability (Obtener horarios)
router.get('/me/availability', authenticate, async (req: any, res: any, next: any) => {
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
    next(error);
  }
});

// PUT /api/professionals/me/availability (Actualizar horarios)
router.put('/me/availability', authenticate, async (req: any, res: any, next: any) => {
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
    next(error);
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. DIRECTORIO DINÃMICO (Buscador real con filtros)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET /api/professionals
router.get('/', async (req, res, next) => {
  try {
    const { category, q, maxPrice, minPrice, minRating, verifiedOnly, insurers, consultationMode, symptom, specialty, location, immediate } = req.query;

    const whereClause: any = {
      category: { in: PROFESSIONAL_CATEGORIES as any },
      isVerified: true,  // Solo mostrar perfiles verificados en el directorio (consistente con GET /:id)
      AND: [],
    };

    if (category) {
      const normalizedCategories = normalizeArrayInput(category).map((value) => value.toUpperCase());
      if (normalizedCategories.some((value) => !HEALTH_CATEGORIES.has(value as any))) {
        return res.json([]);
      }
      whereClause.category = normalizedCategories.length === 1 ? normalizedCategories[0] : { in: normalizedCategories as any };
    }

    if (q) {
      const searchTerm = String(q).trim();
      const searchSpecialty = resolveSearchSpecialty(searchTerm);

      if (searchSpecialty && MEDICAL_SPECIALTY_FILTERS.has(searchSpecialty)) {
        whereClause.medicalSpecialty = searchSpecialty;
      }

      whereClause.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];

      if (searchSpecialty) {
        whereClause.OR.push({ medicalSpecialty: searchSpecialty as any });
        whereClause.OR.push({ treatedConditions: { has: searchTerm } });
      }
    }

    const normalizedSpecialtyFilter = specialty ? String(specialty).trim().toUpperCase() : null;
    if (normalizedSpecialtyFilter && MEDICAL_SPECIALTY_FILTERS.has(normalizedSpecialtyFilter)) {
      whereClause.medicalSpecialty = normalizedSpecialtyFilter;
    }

    const normalizedInsurerFilters = normalizeArrayInput(insurers).map((value) => value.toUpperCase()).filter((value) => INSURANCE_PROVIDERS.has(value));
    if (normalizedInsurerFilters.length > 0) {
      whereClause.acceptedInsurers = { hasSome: normalizedInsurerFilters as any };
    }

    const normalizedModeFilters = normalizeArrayInput(consultationMode).map((value) => value.toUpperCase()).filter((value) => CONSULTATION_MODES.has(value));
    if (normalizedModeFilters.length > 0) {
      whereClause.consultationModes = { hasSome: normalizedModeFilters as any };
    }

    const symptomSpecialty = symptom ? resolveSymptomToSpecialty(String(symptom)) : null;
    if (symptomSpecialty) {
      const normalizedSpecialty = String(symptomSpecialty).trim().toUpperCase();
      if (MEDICAL_SPECIALTY_FILTERS.has(normalizedSpecialty)) {
        whereClause.medicalSpecialty = normalizedSpecialty;
      }
    }

    const locationTerm = normalizeTextInput(location);
    if (locationTerm) {
      whereClause.AND.push({
        OR: [
          { city: { contains: locationTerm, mode: 'insensitive' } },
          { state: { contains: locationTerm, mode: 'insensitive' } },
          { officeAddress: { contains: locationTerm, mode: 'insensitive' } },
          { serviceAreas: { has: locationTerm } },
        ],
      });
    }

    if (String(immediate).toLowerCase() === 'true') {
      whereClause.availabilities = { some: { dayOfWeek: new Date().getDay() } };
    }

    const priceFilter = buildPriceFilter(minPrice, maxPrice);
    if (priceFilter) {
      whereClause.AND.push(priceFilter);
    }

    if (String(verifiedOnly).toLowerCase() === 'true') {
      whereClause.isVerified = true;
    }

    if (whereClause.AND.length === 0) {
      delete whereClause.AND;
    }

    const professionals = await prisma.professional.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { featuredRank: 'asc' },
        { isVerified: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 20
    });

    const formatted = professionals.map(p => {
      const rating = p.reviews.length > 0
        ? (p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length).toFixed(1)
        : '5.0';

      return {
        id: p.id,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        title: p.title,
        category: p.category,
        medicalSpecialty: p.medicalSpecialty,
        treatedConditions: p.treatedConditions,
        consultationModes: p.consultationModes,
        officeAddress: p.officeAddress,
        serviceAreas: p.serviceAreas,
        languages: p.languages,
        acceptedInsurers: p.acceptedInsurers,
        slotIntervalMinutes: p.slotIntervalMinutes || 30,
        presencialRate: p.presencialRate ? Number(p.presencialRate) : null,
        telemedicineRate: p.telemedicineRate ? Number(p.telemedicineRate) : null,
        homeVisitRate: p.homeVisitRate ? Number(p.homeVisitRate) : null,
        hourlyRate: p.hourlyRate,
        isVerified: p.isVerified,
        rating: rating,
        reviewCount: p.reviews.length
      };
    });

    let results = formatted;
    if (minRating) {
      const minR = parseFloat(String(minRating));
      results = results.filter((p: any) => parseFloat(p.rating) >= minR);
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. RUTAS CON PARÃMETROS DINÃMICOS AL FINAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// GET /api/professionals/:id/review-eligibility
router.get('/:id/review-eligibility', authenticate, async (req: any, res, next) => {
  try {
    const professionalId = String(req.params.id || '');
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();

    if (!professionalId) {
      return res.status(400).json({ canReview: false, reasons: ['ID profesional invalido'], completedAppointmentsAvailable: [] });
    }
    if (!userId || role !== 'CLIENT') {
      return res.json({ canReview: false, reasons: ['Solo clientes pueden reseñar'], completedAppointmentsAvailable: [] });
    }

    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, category: { in: PROFESSIONAL_CATEGORIES as any } },
      select: { id: true },
    });
    if (!professional) {
      return res.status(404).json({ canReview: false, reasons: ['Profesional no disponible'], completedAppointmentsAvailable: [] });
    }

    const completedAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        clientId: userId,
        status: 'COMPLETED',
      },
      orderBy: { scheduledAt: 'desc' },
      select: { id: true, scheduledAt: true, service: true },
    });

    const existingReviews = await prisma.review.findMany({
      where: {
        professionalId,
        authorId: userId,
        appointmentId: { not: null },
      },
      select: { appointmentId: true },
    });
    const reviewedAppointmentIds = new Set(existingReviews.map((r) => r.appointmentId).filter(Boolean));
    const completedAppointmentsAvailable = completedAppointments.filter((a) => !reviewedAppointmentIds.has(a.id));

    const reasons: string[] = [];
    if (completedAppointments.length === 0) reasons.push('No tienes citas completadas con este profesional');
    if (completedAppointmentsAvailable.length === 0 && completedAppointments.length > 0) reasons.push('Ya reseñaste todas tus citas completadas');

    res.json({
      canReview: completedAppointmentsAvailable.length > 0,
      reasons,
      completedAppointmentsAvailable,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/professionals/:id/reviews
router.post('/:id/reviews', authenticate, async (req: any, res, next) => {
  try {
    const professionalId = String(req.params.id || '');
    const userId = req.user?.userId;
    const role = String(req.user?.role || '').toUpperCase();
    const appointmentId = String(req.body?.appointmentId || '');
    const rating = Number(req.body?.rating);
    const rawComment = req.body?.comment;
    const comment = typeof rawComment === 'string' ? rawComment.trim() : '';

    if (!professionalId || !appointmentId) {
      return res.status(400).json({ error: 'professionalId y appointmentId son obligatorios' });
    }
    if (!userId || role !== 'CLIENT') {
      return res.status(403).json({ error: 'Solo clientes pueden crear reseñas' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating debe ser un entero entre 1 y 5' });
    }

    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, category: { in: PROFESSIONAL_CATEGORIES as any } },
      select: { id: true },
    });
    if (!professional) {
      return res.status(404).json({ error: 'Profesional no disponible' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, professionalId: true, clientId: true, status: true },
    });
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    if (appointment.professionalId !== professionalId) {
      return res.status(400).json({ error: 'La cita no corresponde al profesional indicado' });
    }
    if (appointment.clientId !== userId) {
      return res.status(403).json({ error: 'No puedes reseñar una cita de otro cliente' });
    }
    if (appointment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Solo puedes reseñar citas completadas' });
    }

    const duplicate = await prisma.review.findUnique({ where: { appointmentId } });
    if (duplicate) {
      return res.status(409).json({ error: 'Esta cita ya tiene una reseña registrada' });
    }

    const review = await prisma.review.create({
      data: {
        appointmentId,
        authorId: userId,
        professionalId,
        rating,
        comment: comment || null,
        isVerified: true,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: { select: { name: true, avatarUrl: true } },
      },
    });

    res.status(201).json({
      id: review.id,
      name: review.author.name,
      avatarUrl: review.author.avatarUrl,
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt,
    });
  } catch (error) {
    next(error);
  }
});
// GET /api/professionals/:id/reviews
router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { id } = req.params;
    const professional = await prisma.professional.findFirst({
      where: { id, category: { in: PROFESSIONAL_CATEGORIES as any } },
      select: { id: true },
    });
    if (!professional) return res.json([]);

    const reviews = await prisma.review.findMany({
      where: {
        professionalId: id,
        appointmentId: { not: null },
        appointment: { is: { status: 'COMPLETED' } },
      },
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
      isVerified: true,
      date: r.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// GET /api/professionals/:id (Perfil PÃºblico)
router.get('/:id', optionalAuthenticate, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const viewerUserId = req.user?.userId || null;

    const professional = await prisma.professional.findFirst({
      where: { id, category: { in: PROFESSIONAL_CATEGORIES as any } },
      include: {
        user: true,
        reviews: { include: { appointment: true } },
        orders: true,
        portfolioItems: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!professional) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    // Filtro isVerified: solo mostrar perfiles verificados al pÃºblico
    // EXCEPCIÃ“N: el dueÃ±o puede ver su propio perfil no verificado
    const isOwner = viewerUserId && professional.userId === viewerUserId;
    if (!professional.isVerified && !isOwner) {
      return res.status(404).json({ message: 'Profesional no encontrado' });
    }

    const viewerGuestId = typeof req.query.guestId === 'string' ? req.query.guestId : null;
    await prisma.profileView.create({
      data: {
        professionalId: id,
        viewerUserId: viewerUserId || undefined,
        viewerGuestId: viewerGuestId || undefined,
      },
    }).catch(() => null);

    const completedOrders = professional.orders.filter((o: any) => o.status === 'COMPLETADO');
    const totalNonDraftOrders = professional.orders.filter(
      (o: any) => !['DRAFT', 'CANCELADO'].includes(o.status)
    );

    const verifiedAppointmentReviews = professional.reviews.filter((review: any) => (
      review.appointmentId && review.appointment?.status === 'COMPLETED'
    ));
    const totalReviews = verifiedAppointmentReviews.length;
    const avgRating = totalReviews > 0
      ? verifiedAppointmentReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews
      : 5.0;

    const yearsActive = Math.max(
      1,
      Math.floor((Date.now() - professional.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365))
    );

    const successRate = totalNonDraftOrders.length > 0
      ? Math.round((completedOrders.length / totalNonDraftOrders.length) * 100)
      : 98;

    let phoneVisible: string | null = null;
    if (viewerUserId) {
      const escrowOrder = await prisma.order.findFirst({
        where: {
          professionalId: id,
          clientId: viewerUserId,
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
      userId: professional.userId,
      name: professional.user?.name || 'Profesional Certificado',
      phone: phoneVisible,
      avatarUrl: professional.user?.avatarUrl,
      title: professional.title,
      bio: professional.bio,
      isVerified: professional.isVerified,
      biometricDone: professional.biometricDone,
      yearsExp: `${professional.experienceYears ?? yearsActive}+`,
      projectsCount: `${completedOrders.length}`,
      successRate: `${successRate}%`,
      rating: avgRating.toFixed(1),
      reviewCount: totalReviews,
      // Datos de precios y categorÃ­a â€” necesarios para la UI del perfil
      hourlyRate: professional.hourlyRate ? Number(professional.hourlyRate) : null,
      currency: professional.currency || 'MXN',
      category: professional.category,
      medicalSpecialty: professional.medicalSpecialty,
      treatedConditions: professional.treatedConditions,
      consultationModes: professional.consultationModes,
      officeAddress: professional.officeAddress,
      experienceYears: professional.experienceYears,
      certifications: professional.certifications,
      associations: professional.associations,
      emergencyDisclaimerAccepted: professional.emergencyDisclaimerAccepted,
      serviceAreas: professional.serviceAreas,
      languages: professional.languages,
      acceptedInsurers: professional.acceptedInsurers,
      slotIntervalMinutes: professional.slotIntervalMinutes || 30,
      presencialRate: professional.presencialRate ? Number(professional.presencialRate) : null,
      telemedicineRate: professional.telemedicineRate ? Number(professional.telemedicineRate) : null,
      homeVisitRate: professional.homeVisitRate ? Number(professional.homeVisitRate) : null,
      portfolioItems: professional.portfolioItems,
    });
  } catch (error) {
    next(error);
  }
});

export { router as professionalsRouter };


