import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';

const router = Router();

async function getProfessionalForUser(userId: string) {
  return prisma.professional.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });
}

router.get('/me', authenticate, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden consultar disponibilidad' });
    }
    const professional = await getProfessionalForUser(req.user.userId);
    if (!professional) return res.status(404).json({ error: 'Perfil profesional no encontrado' });

    const [rules, overrides] = await Promise.all([
      prisma.availabilityRule.findMany({ where: { professionalId: professional.id }, orderBy: { dayOfWeek: 'asc' } }),
      prisma.availabilityOverride.findMany({ where: { professionalId: professional.id }, orderBy: { date: 'asc' } }),
    ]);

    res.json({ professionalId: professional.id, rules, overrides });
  } catch (error) {
    next(error);
  }
});

router.put('/rules', authenticate, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden editar disponibilidad' });
    }
    const professional = await getProfessionalForUser(req.user.userId);
    if (!professional) return res.status(404).json({ error: 'Perfil profesional no encontrado' });

    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    for (const rule of rules) {
      const dayOfWeek = Number(rule.dayOfWeek);
      const startTime = String(rule.startTime || '');
      const endTime = String(rule.endTime || '');
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
        return res.status(400).json({ error: 'Regla de disponibilidad invalida' });
      }
    }

    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({ where: { professionalId: professional.id } }),
      ...rules.map((rule: any) => prisma.availabilityRule.create({
        data: {
          professionalId: professional.id,
          dayOfWeek: Number(rule.dayOfWeek),
          startTime: String(rule.startTime),
          endTime: String(rule.endTime),
          isActive: rule.isActive !== false,
        },
      })),
    ]);

    const savedRules = await prisma.availabilityRule.findMany({
      where: { professionalId: professional.id },
      orderBy: { dayOfWeek: 'asc' },
    });
    res.json({ professionalId: professional.id, rules: savedRules });
  } catch (error) {
    next(error);
  }
});

router.post('/overrides', authenticate, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden editar bloqueos' });
    }
    const professional = await getProfessionalForUser(req.user.userId);
    if (!professional) return res.status(404).json({ error: 'Perfil profesional no encontrado' });

    const date = new Date(String(req.body?.date || ''));
    const type = String(req.body?.type || '').toUpperCase();
    const startTime = req.body?.startTime ? String(req.body.startTime) : null;
    const endTime = req.body?.endTime ? String(req.body.endTime) : null;
    if (Number.isNaN(date.getTime()) || !['BLOCK', 'EXTRA_AVAILABLE'].includes(type)) {
      return res.status(400).json({ error: 'Override invalido' });
    }
    if ((startTime || endTime) && (!startTime || !endTime || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime)) {
      return res.status(400).json({ error: 'Rango de horas invalido' });
    }

    const override = await prisma.availabilityOverride.create({
      data: {
        professionalId: professional.id,
        date,
        startTime,
        endTime,
        type: type as any,
        reason: req.body?.reason ? String(req.body.reason).slice(0, 500) : null,
      },
    });

    res.status(201).json(override);
  } catch (error) {
    next(error);
  }
});

router.delete('/overrides/:id', authenticate, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'PROFESSIONAL') {
      return res.status(403).json({ error: 'Solo profesionales pueden editar bloqueos' });
    }
    const professional = await getProfessionalForUser(req.user.userId);
    if (!professional) return res.status(404).json({ error: 'Perfil profesional no encontrado' });

    const override = await prisma.availabilityOverride.findUnique({ where: { id: req.params.id } });
    if (!override) return res.status(404).json({ error: 'Bloqueo no encontrado' });
    if (override.professionalId !== professional.id) return res.status(403).json({ error: 'No tienes permiso para eliminar este bloqueo' });

    await prisma.availabilityOverride.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as availabilityRouter };
