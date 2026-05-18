import { Router } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { Role, OrderStatus, AppointmentStatus } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../lib/email';
import { notifyUser } from '../lib/notifications';
import { logger } from '../lib/logger';
import { DEFAULT_PROFESSIONAL_CATEGORY } from '../constants/verificationFields';

const router = Router();
const localPrivateUploadsDir = path.resolve(__dirname, '../../uploads/private');
const hasAwsPrivateStorage =
  !!process.env.AWS_REGION &&
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY &&
  !!process.env.AWS_S3_BUCKET_NAME;
const privateS3Client = hasAwsPrivateStorage
  ? new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null;

type VideoProvider = 'jitsi' | 'zoom' | 'meet';

type AppointmentVideoSession = {
  provider: VideoProvider;
  roomName?: string | null;
  joinUrl?: string | null;
  embedAllowed?: boolean;
  status?: 'ACTIVE' | 'EXTERNAL';
  source?: 'AUTO' | 'MANUAL' | 'LEGACY';
  createdAt?: string | null;
  updatedAt?: string | null;
};

function parseAppointmentMeta(notes?: string | null): any {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function inferVideoProviderFromUrl(url: string): VideoProvider {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('zoom.us') || host.includes('zoom.com')) return 'zoom';
    if (host.includes('meet.google')) return 'meet';
    if (host.includes('jitsi') || host.includes('8x8.vc')) return 'jitsi';
  } catch {
    // Ignore parsing errors.
  }
  return 'meet';
}

function normalizeVideoSession(meta: any): AppointmentVideoSession | null {
  const raw = meta?.videoSession;
  const meetingLink = typeof meta?.meetingLink === 'string' ? sanitizeHttpUrl(meta.meetingLink) : null;
  if (raw && typeof raw === 'object') {
    const joinUrl = typeof raw.joinUrl === 'string' ? sanitizeHttpUrl(raw.joinUrl) : null;
    const provider = (String(raw.provider || '').toLowerCase() as VideoProvider) || inferVideoProviderFromUrl(joinUrl || meetingLink || '');
    if (joinUrl || raw.roomName) {
      return {
        provider: provider === 'zoom' || provider === 'meet' || provider === 'jitsi' ? provider : inferVideoProviderFromUrl(joinUrl || meetingLink || ''),
        roomName: typeof raw.roomName === 'string' ? raw.roomName : null,
        joinUrl,
        embedAllowed: provider === 'jitsi',
        status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
        source: raw.source === 'AUTO' || raw.source === 'MANUAL' || raw.source === 'LEGACY' ? raw.source : 'MANUAL',
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : null,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      };
    }
  }
  if (!meetingLink) return null;
  const provider = inferVideoProviderFromUrl(meetingLink);
  return {
    provider,
    roomName: provider === 'jitsi' ? meetingLink.split('/').filter(Boolean).pop() || null : null,
    joinUrl: meetingLink,
    embedAllowed: provider === 'jitsi',
    status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
    source: 'LEGACY',
  };
}

function isStrongPassword(password: string) {
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasUpper && hasLower && hasNumber;
}

function resolveLocalPrivatePath(filename: string): string | null {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename) return null;
  const resolved = path.resolve(localPrivateUploadsDir, safeName);
  if (!resolved.startsWith(localPrivateUploadsDir)) return null;
  return resolved;
}

function toPositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseFeaturedRank(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 999);
}

const SALES_COMPLETED_STATUSES: OrderStatus[] = ['PAYOUT_COMPLETADO', 'COMPLETADO'];
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PAGO_PENDIENTE',
  'FONDOS_EN_ESCROW',
  'EN_PROGRESO',
  'EN_DISPUTA',
  'PAYOUT_INICIADO',
  'PAYOUT_FALLIDO',
];

function parseRole(value: unknown): Role | null {
  const normalized = String(value ?? '').trim().toUpperCase();
  const allowedRoles: Role[] = ['CLIENT', 'PROFESSIONAL', 'ADMIN'];
  return allowedRoles.includes(normalized as Role) ? (normalized as Role) : null;
}

// FIX: Guard de ADMIN centralizado — se aplica a TODAS las rutas del router.
// Elimina la necesidad de repetir el check en cada handler individualmente.
// Si alguien agrega un nuevo endpoint y olvida el check, igual queda protegido.
router.use(authenticate, (req: any, res: any, next: any) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  next();
});

// GET /api/admin/stats
router.get('/stats', async (_req: any, res: any, next: any) => {
  try {
    const [
      totalUsers,
      usersByRole,
      verifiedProfessionals,
      professionalsInReview,
      pendingVerificationDocuments,
      completedSalesAggregate,
      ordersByStatus,
      appointmentsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
        where: { deletionRequestedAt: null },
      }),
      prisma.professional.count({ where: { isVerified: true } }),
      prisma.professional.count({ where: { verificationStatus: 'IN_REVIEW' } }),
      prisma.verificationDocument.count({ where: { status: 'PENDING' } }),
      prisma.order.aggregate({
        where: { status: { in: SALES_COMPLETED_STATUSES } },
        _sum: { agreedPrice: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = ordersByStatus.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {} as Record<OrderStatus, number>);
    const appointmentStatusCounts = appointmentsByStatus.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {} as Record<AppointmentStatus, number>);
    const roleCounts = usersByRole.reduce((acc, row) => {
      acc[row.role] = row._count._all;
      return acc;
    }, {} as Record<Role, number>);

    const totalOrders = ordersByStatus.reduce((sum, row) => sum + row._count._all, 0);
    const activeOrders = ACTIVE_ORDER_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
    const completedOrders = SALES_COMPLETED_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
    const activeDisputes = statusCounts.EN_DISPUTA || 0;
    const resolvedDisputes = (statusCounts.COMPLETADO || 0) + (statusCounts.REEMBOLSADO || 0);
    const pendingPaymentAppointments = appointmentStatusCounts.PENDING_PAYMENT || 0;
    const scheduledAppointments = appointmentStatusCounts.SCHEDULED || 0;
    const inProgressAppointments = appointmentStatusCounts.IN_PROGRESS || 0;
    const completedAppointments = appointmentStatusCounts.COMPLETED || 0;
    const completedRevenue = completedSalesAggregate._sum.agreedPrice
      ? Number(completedSalesAggregate._sum.agreedPrice)
      : 0;

    res.json({
      // Compatibilidad con frontend actual
      totalUsers,
      verifiedProfessionals,
      totalOrders,
      completedRevenue,
      pendingPaymentAppointments,
      activeDisputes,
      // Contrato extendido para superadmin
      users: {
        total: totalUsers,
        active: (roleCounts.CLIENT || 0) + (roleCounts.PROFESSIONAL || 0) + (roleCounts.ADMIN || 0),
        clients: roleCounts.CLIENT || 0,
        professionals: roleCounts.PROFESSIONAL || 0,
        admins: roleCounts.ADMIN || 0,
      },
      verifications: {
        verifiedProfessionals,
        professionalsInReview,
        pendingDocuments: pendingVerificationDocuments,
      },
      appointments: {
        pendingPayment: pendingPaymentAppointments,
        scheduled: scheduledAppointments,
        inProgress: inProgressAppointments,
        completed: completedAppointments,
      },
      disputes: {
        active: activeDisputes,
        resolved: resolvedDisputes,
      },
      volume: {
        completedRevenue,
        completedOrders,
        totalOrders,
      },
      orders: {
        total: totalOrders,
        active: activeOrders,
        completed: completedOrders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/specialty-kpis
router.get('/specialty-kpis', async (_req: any, res: any, next: any) => {
  try {
    const professionals = await prisma.professional.findMany({
      select: {
        id: true,
        category: true,
        medicalSpecialty: true,
        isVerified: true,
        appointments: { select: { status: true } },
        reviews: { select: { rating: true } },
        orders: { select: { status: true, agreedPrice: true } },
      },
    });

    const buckets = new Map<string, any>();
    professionals.forEach((pro) => {
      const specialty = pro.medicalSpecialty || pro.category || 'SIN_ESPECIALIDAD';
      const bucket = buckets.get(specialty) || {
        specialty,
        professionals: 0,
        verifiedProfessionals: 0,
        appointments: 0,
        completedAppointments: 0,
        reviews: 0,
        ratingSum: 0,
        completedRevenue: 0,
      };

      bucket.professionals += 1;
      if (pro.isVerified) bucket.verifiedProfessionals += 1;
      bucket.appointments += pro.appointments.length;
      bucket.completedAppointments += pro.appointments.filter((a) => a.status === 'COMPLETED').length;
      bucket.reviews += pro.reviews.length;
      bucket.ratingSum += pro.reviews.reduce((sum, review) => sum + review.rating, 0);
      bucket.completedRevenue += pro.orders
        .filter((order) => SALES_COMPLETED_STATUSES.includes(order.status))
        .reduce((sum, order) => sum + Number(order.agreedPrice || 0), 0);

      buckets.set(specialty, bucket);
    });

    res.json([...buckets.values()]
      .map((bucket) => ({
        specialty: bucket.specialty,
        professionals: bucket.professionals,
        verifiedProfessionals: bucket.verifiedProfessionals,
        appointments: bucket.appointments,
        completedAppointments: bucket.completedAppointments,
        reviews: bucket.reviews,
        averageRating: bucket.reviews > 0 ? Number((bucket.ratingSum / bucket.reviews).toFixed(1)) : null,
        completedRevenue: bucket.completedRevenue,
      }))
      .sort((a, b) => b.completedAppointments - a.completedAppointments || b.professionals - a.professionals));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users?page=1&limit=20&search=correo
router.get('/users', async (req: any, res: any, next: any) => {
  try {
    const page = toPositiveInt(req.query?.page, 1);
    const limit = Math.min(toPositiveInt(req.query?.limit, 20), 100);
    const searchRaw = String(req.query?.search || '').trim();

    const where = searchRaw
      ? {
          OR: [
            { name: { contains: searchRaw, mode: 'insensitive' as const } },
            { email: { contains: searchRaw, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          deletionRequestedAt: true,
          professional: {
            select: {
              id: true,
              title: true,
              category: true,
              isVerified: true,
              verificationStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      items: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletionRequestedAt: user.deletionRequestedAt,
        accountStatus: user.deletionRequestedAt ? 'INACTIVO' : 'ACTIVO',
        verificationStatus: user.professional?.verificationStatus || null,
        professional: user.professional
          ? {
              id: user.professional.id,
              title: user.professional.title,
              category: user.professional.category,
              isVerified: user.professional.isVerified,
              verificationStatus: user.professional.verificationStatus,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: any, res: any, next: any) => {
  try {
    const targetUserId = String(req.params?.id || '').trim();
    const currentAdminId = req.user?.userId;

    if (!targetUserId) {
      return res.status(400).json({ error: 'ID de usuario invalido' });
    }

    if (targetUserId === currentAdminId) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta ADMIN' });
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        email: true,
        deletionRequestedAt: true,
        professional: { select: { id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (existing.deletionRequestedAt) {
      return res.json({
        message: 'El usuario ya estaba desactivado',
        userId: targetUserId,
        deletionRequestedAt: existing.deletionRequestedAt,
      });
    }

    if (existing.role === 'ADMIN') {
      const activeAdmins = await prisma.user.count({
        where: {
          role: 'ADMIN',
          deletionRequestedAt: null,
        },
      });
      if (activeAdmins <= 1) {
        return res.status(409).json({ error: 'No se puede desactivar al ultimo administrador activo' });
      }
    }

    const deactivationDate = new Date();
    const blockedPasswordHash = await bcrypt.hash(`deactivated:${targetUserId}:${deactivationDate.toISOString()}`, 10);

    const softDeleted = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          deletionRequestedAt: deactivationDate,
          passwordHash: blockedPasswordHash,
        },
        select: {
          id: true,
          email: true,
          role: true,
          deletionRequestedAt: true,
        },
      });

      await tx.refreshToken.deleteMany({ where: { userId: targetUserId } });

      if (existing.professional?.id) {
        await tx.professional.update({
          where: { id: existing.professional.id },
          data: {
            isVerified: false,
            verificationStatus: 'REJECTED',
          },
        });
      }

      return updatedUser;
    });

    logger.info(
      {
        adminId: currentAdminId,
        targetUserId,
        targetEmail: existing.email,
        softDeleteField: 'deletionRequestedAt',
      },
      'Admin realizo soft delete de usuario',
    );

    res.json({
      message: 'Usuario desactivado correctamente (soft delete)',
      user: softDeleted,
      authRevoked: true,
      schemaSuggestion: 'Para bloqueo global y filtro de directorio mas directo, considera agregar User.isActive Boolean @default(true).',
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req: any, res: any, next: any) => {
  try {
    const targetUserId = String(req.params?.id || '').trim();
    const currentAdminId = req.user?.userId;
    const nextRole = parseRole(req.body?.role);

    if (!targetUserId) {
      return res.status(400).json({ error: 'ID de usuario invalido' });
    }

    if (!nextRole) {
      return res.status(400).json({ error: 'Rol invalido. Usa: CLIENT, PROFESSIONAL o ADMIN.' });
    }

    if (targetUserId === currentAdminId && nextRole !== 'ADMIN') {
      return res.status(400).json({ error: 'No puedes retirarte el rol ADMIN a ti mismo' });
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        email: true,
        deletionRequestedAt: true,
        professional: { select: { id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (existing.deletionRequestedAt) {
      return res.status(409).json({ error: 'No se puede cambiar el rol de un usuario desactivado' });
    }

    if (existing.role === 'ADMIN' && nextRole !== 'ADMIN') {
      const activeAdmins = await prisma.user.count({
        where: {
          role: 'ADMIN',
          deletionRequestedAt: null,
        },
      });
      if (activeAdmins <= 1) {
        return res.status(409).json({ error: 'No se puede degradar al ultimo administrador activo' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (nextRole === 'PROFESSIONAL' && !existing.professional) {
        await tx.professional.create({
          data: {
            userId: targetUserId,
            title: '',
            category: DEFAULT_PROFESSIONAL_CATEGORY as any,
            currency: 'MXN',
          },
        });
      }

      return tx.user.update({
        where: { id: targetUserId },
        data: { role: nextRole },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });
    });

    logger.info(
      {
        adminId: currentAdminId,
        targetUserId,
        targetEmail: existing.email,
        previousRole: existing.role,
        nextRole,
      },
      'Admin modifico el rol de un usuario',
    );

    res.json({
      message: 'Rol actualizado correctamente',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/operators
router.get('/operators', async (_req: any, res: any, next: any) => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(operators);
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/operators
router.post('/operators', async (req: any, res: any, next: any) => {
  try {
    const rawName = String(req.body?.name || '').trim();
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    const rawPassword = String(req.body?.password || '');

    if (!rawName) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }

    if (!isStrongPassword(rawPassword)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const created = await prisma.user.create({
      data: {
        name: rawName,
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/verifications/pending
router.get('/verifications/pending', async (req, res, next) => {
  try {
    const pendingDocs = await prisma.verificationDocument.findMany({
      where: { status: 'PENDING' },
      include: {
        professional: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const docsWithSecureUrl = pendingDocs.map((doc) => ({
      ...doc,
      fileUrl: `/api/admin/verifications/${doc.id}/file`,
    }));

    res.json(docsWithSecureUrl);
  } catch (error) {
    next(error);
  }
});

router.get('/verifications/:id/file', async (req: any, res: any, next: any) => {
  try {
    const docId = String(req.params.id || '').trim();
    if (!docId) {
      return res.status(400).json({ error: 'Documento invalido' });
    }

    const doc = await prisma.verificationDocument.findUnique({
      where: { id: docId },
      select: { fileUrl: true },
    });

    if (!doc?.fileUrl) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const fileUrl = String(doc.fileUrl).trim();

    if (fileUrl.startsWith('private:local:')) {
      const filename = fileUrl.replace('private:local:', '').trim();
      const localPath = resolveLocalPrivatePath(filename);
      if (!localPath || !fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }
      return res.sendFile(localPath);
    }

    if (fileUrl.startsWith('private:s3:')) {
      const key = fileUrl.replace('private:s3:', '').trim();
      if (!key || !key.startsWith('private/')) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }
      if (!privateS3Client || !process.env.AWS_S3_BUCKET_NAME) {
        logger.error({ docId }, 'S3 no configurado para lectura de documentos de verificacion');
        return res.status(503).json({ error: 'Documento no disponible temporalmente' });
      }

      const object = await privateS3Client.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
        }),
      );

      if (!object.Body) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      if (object.ContentType) {
        res.setHeader('Content-Type', object.ContentType);
      }
      if (object.ContentLength != null) {
        res.setHeader('Content-Length', String(object.ContentLength));
      }

      const body = object.Body as any;
      if (typeof body.pipe === 'function') {
        return body.pipe(res);
      }
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    if (fileUrl.startsWith('/uploads/private/')) {
      const filename = fileUrl.replace('/uploads/private/', '').trim();
      const localPath = resolveLocalPrivatePath(filename);
      if (!localPath || !fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }
      return res.sendFile(localPath);
    }

    logger.warn({ docId }, 'Formato de fileUrl de verificacion no reconocido');
    return res.status(404).json({ error: 'Documento no encontrado' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/verifications/:id/approve
router.patch('/verifications/:id/approve', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const result = await prisma.$transaction(async (tx: any) => {
      const doc = await tx.verificationDocument.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      const REQUIRED_DOC_TYPES_FOR_VERIFICATION = ['INE', 'CONOCER_CERT'];
      const approvedDocs = await tx.verificationDocument.findMany({
        where: {
          professionalId: doc.professionalId,
          status: 'APPROVED',
          type: { in: REQUIRED_DOC_TYPES_FOR_VERIFICATION as any },
        },
        select: { type: true },
      });

      const approvedTypes = new Set(approvedDocs.map((d: any) => d.type));
      const hasAllRequiredDocs = REQUIRED_DOC_TYPES_FOR_VERIFICATION.every((docType) => approvedTypes.has(docType));

      if (hasAllRequiredDocs) {
        const updatedProf = await tx.professional.update({
          where: { id: doc.professionalId },
          data: { isVerified: true, verificationStatus: 'APPROVED' },
          include: { user: true },
        });

        sendEmail({
          to: updatedProf.user.email,
          subject: '¡Verificación Aprobada! - Intecnia',
          html: emailTemplates.verificationApproved(updatedProf.user.name),
        }).catch((error) => logger.error({ err: error, userId: updatedProf.userId }, 'Error enviando email de verificación aprobada'));
      } else {
        await tx.professional.update({
          where: { id: doc.professionalId },
          data: { isVerified: false, verificationStatus: 'IN_REVIEW' },
        });
      }
      return doc;
    });

    res.json({ message: 'Documento aprobado exitosamente', document: result });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/verifications/:id/reject
router.patch('/verifications/:id/reject', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });
    }

    const doc = await prisma.verificationDocument.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
      include: {
        professional: {
          include: { user: true }
        }
      }
    });

    if (doc.type === 'INE' || doc.type === 'CONOCER_CERT') {
      await prisma.professional.update({
        where: { id: doc.professionalId },
        data: { isVerified: false, verificationStatus: 'REJECTED' },
      });
    }

    sendEmail({
      to: doc.professional.user.email,
      subject: 'Actualizacion requerida en tu Verificacion - Intecnia',
      html: emailTemplates.verificationRejected(doc.professional.user.name, reason.trim())
    }).catch((error) => logger.error({ err: error, userId: doc.professional.userId }, 'Error enviando email de verificación rechazada'));

    res.json({ message: 'Documento rechazado. Se notificara al profesional.', document: doc });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/appointments/upcoming
router.get('/appointments/upcoming', async (_req: any, res: any, next: any) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING_PAYMENT', 'SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        professional: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    const normalized = appointments.map((a) => {
      const meta = parseAppointmentMeta(a.notes);
      return {
        ...a,
        meetingLink: meta?.meetingLink ?? null,
        videoSession: normalizeVideoSession(meta),
      };
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/professionals/active
router.get('/professionals/active', async (_req: any, res: any, next: any) => {
  try {
    const professionals = await prisma.professional.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        title: true,
        category: true,
        isFeatured: true,
        featuredRank: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { featuredRank: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    res.json(professionals.map((p) => ({
      id: p.id,
      name: p.user?.name || 'Profesional',
      email: p.user?.email || null,
      title: p.title || '',
      category: p.category,
      isFeatured: p.isFeatured,
      featuredRank: p.featuredRank,
    })));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/professionals/:id/featured
router.patch('/professionals/:id/featured', async (req: any, res: any, next: any) => {
  try {
    const professionalId = String(req.params?.id || '').trim();
    if (!professionalId) {
      return res.status(400).json({ error: 'ID de profesional invalido' });
    }

    const updated = await prisma.professional.update({
      where: { id: professionalId },
      data: {
        isFeatured: Boolean(req.body?.isFeatured),
        featuredRank: parseFeaturedRank(req.body?.featuredRank),
      },
      select: {
        id: true,
        title: true,
        category: true,
        isFeatured: true,
        featuredRank: true,
        user: { select: { name: true, email: true } },
      },
    });

    res.json({
      id: updated.id,
      name: updated.user?.name || 'Profesional',
      email: updated.user?.email || null,
      title: updated.title || '',
      category: updated.category,
      isFeatured: updated.isFeatured,
      featuredRank: updated.featuredRank,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reviews
router.get('/reviews', async (_req: any, res: any, next: any) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        author: { select: { name: true, email: true } },
        professional: { include: { user: { select: { name: true, email: true } } } },
        appointment: { select: { id: true, scheduledAt: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVerified: review.isVerified,
      createdAt: review.createdAt,
      appointment: review.appointment,
      author: review.author,
      professional: {
        id: review.professionalId,
        name: review.professional.user?.name || 'Profesional',
        email: review.professional.user?.email || null,
      },
    })));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req: any, res: any, next: any) => {
  try {
    const reviewId = String(req.params?.id || '').trim();
    if (!reviewId) {
      return res.status(400).json({ error: 'ID de resena invalido' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: 'Resena eliminada correctamente', reviewId });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/appointments/:id/meeting-link
router.patch('/appointments/:id/meeting-link', async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { meetingLink } = req.body;
    const sanitizedMeetingLink = typeof meetingLink === 'string' ? sanitizeHttpUrl(meetingLink) : null;

    if (!sanitizedMeetingLink) {
      return res.status(400).json({ error: 'Debes enviar un link valido (http/https)' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        professional: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });

    const currentMeta = parseAppointmentMeta(appointment.notes) || {};
    const provider = inferVideoProviderFromUrl(sanitizedMeetingLink);
    const nowIso = new Date().toISOString();
    const updatedNotes = JSON.stringify({
      ...currentMeta,
      meetingLink: sanitizedMeetingLink,
      meetingLinkUpdatedAt: nowIso,
      videoSession: {
        provider,
        roomName: provider === 'jitsi' ? sanitizedMeetingLink.split('/').filter(Boolean).pop() || null : null,
        joinUrl: sanitizedMeetingLink,
        embedAllowed: provider === 'jitsi',
        status: provider === 'jitsi' ? 'ACTIVE' : 'EXTERNAL',
        source: 'MANUAL',
        createdAt: currentMeta?.videoSession?.createdAt || nowIso,
        updatedAt: nowIso,
      },
    });

    const updated = await prisma.appointment.update({
      where: { id },
      data: { notes: updatedNotes },
    });

    if (appointment.clientId && appointment.client) {
      notifyUser({
        userId: appointment.clientId,
        type: 'ORDER_STATUS',
        title: 'Link de videollamada asignado',
        body: `Tu cita ya tiene link: ${sanitizedMeetingLink}`,
        metadata: { appointmentId: appointment.id, meetingLink: sanitizedMeetingLink },
        email: appointment.client.email,
        emailSubject: 'Link de tu cita - Intecnia',
        emailHtml: `<p>Tu cita ya tiene link de videollamada:</p><p><a href="${sanitizedMeetingLink}">${sanitizedMeetingLink}</a></p>`,
      }).catch((error) => logger.error({ err: error, appointmentId: appointment.id }, 'Error notificando cliente sobre link de cita'));
    }

    notifyUser({
      userId: appointment.professional.userId,
      type: 'ORDER_STATUS',
      title: 'Link de videollamada actualizado',
      body: `La cita del ${appointment.scheduledAt?.toLocaleDateString('es-MX') ?? ''} tiene nuevo link.`,
      metadata: { appointmentId: appointment.id, meetingLink: sanitizedMeetingLink },
      email: appointment.professional.user.email,
      emailSubject: 'Link actualizado - Intecnia',
      emailHtml: `<p>Se actualizo el link de la cita:</p><p><a href="${sanitizedMeetingLink}">${sanitizedMeetingLink}</a></p>`,
    }).catch((error) => logger.error({ err: error, appointmentId: appointment.id }, 'Error notificando profesional sobre link de cita'));

    res.json({
      message: 'Link de cita actualizado y enviado',
      appointment: {
        ...updated,
        meetingLink: sanitizedMeetingLink,
        videoSession: normalizeVideoSession({
          ...currentMeta,
          meetingLink: sanitizedMeetingLink,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };

