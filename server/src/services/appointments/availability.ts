import { prisma } from '../../lib/db';
import {
  addDays,
  getDayOfWeek,
  getSlotTimeHHMM,
  isValidSlotForInterval,
  parseProfessionalSlotInterval,
  startOfLocalDay,
  toHHMM,
  toMinutes,
} from './time';

const ACTIVE_SLOT_STATUSES = ['REQUESTED', 'CONFIRMED', 'PENDING_PAYMENT', 'SCHEDULED', 'IN_PROGRESS'];

type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED';

export async function ensureSlotInsideAvailability(
  professionalId: string,
  scheduledAt: Date,
  excludeAppointmentId?: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { id: true, slotIntervalMinutes: true },
  });
  if (!professional) return { ok: false, status: 404, error: 'Profesional no encontrado' };

  const slotIntervalMinutes = parseProfessionalSlotInterval(professional.slotIntervalMinutes);
  if (!isValidSlotForInterval(scheduledAt, slotIntervalMinutes)) {
    return { ok: false, status: 400, error: `El horario solicitado no respeta el intervalo clinico de ${slotIntervalMinutes} minutos.` };
  }

  const dayOfWeek = getDayOfWeek(scheduledAt);
  const slotTime = getSlotTimeHHMM(scheduledAt);
  const rule = await prisma.availabilityRule.findUnique({
    where: { professionalId_dayOfWeek: { professionalId, dayOfWeek } },
  });
  const legacyRule = rule || await prisma.availability.findUnique({
    where: { professionalId_dayOfWeek: { professionalId, dayOfWeek } },
  });

  if (!legacyRule || ('isActive' in legacyRule && legacyRule.isActive === false)) {
    return { ok: false, status: 409, error: 'El profesional no tiene disponibilidad configurada para ese dia de la semana' };
  }
  if (slotTime < legacyRule.startTime || slotTime >= legacyRule.endTime) {
    return { ok: false, status: 409, error: `El horario solicitado esta fuera del rango disponible (${legacyRule.startTime} - ${legacyRule.endTime})` };
  }

  const dateStart = startOfLocalDay(scheduledAt);
  const dateEnd = addDays(dateStart, 1);
  const overrides = await prisma.availabilityOverride.findMany({
    where: { professionalId, date: { gte: dateStart, lt: dateEnd } },
  });
  const slotMinutes = toMinutes(slotTime);
  const isBlocked = overrides.some((override) => {
    if (override.type !== 'BLOCK') return false;
    if (!override.startTime || !override.endTime) return true;
    return slotMinutes >= toMinutes(override.startTime) && slotMinutes < toMinutes(override.endTime);
  });
  if (isBlocked) return { ok: false, status: 409, error: 'El horario solicitado esta bloqueado por el profesional' };

  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId,
      scheduledAt,
      status: { in: ACTIVE_SLOT_STATUSES as any },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) return { ok: false, status: 409, error: 'Este horario ya no esta disponible' };

  return { ok: true };
}

export async function getEffectiveAvailability(professionalId: string, from?: Date | null, to?: Date | null) {
  const professional = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: { id: true, slotIntervalMinutes: true },
  });
  if (!professional) return null;

  const slotIntervalMinutes = parseProfessionalSlotInterval(professional.slotIntervalMinutes);
  const fromDay = startOfLocalDay(from || new Date());
  const toDay = startOfLocalDay(to || addDays(fromDay, 14));
  const exclusiveEnd = addDays(toDay, 1);

  const [newRules, legacyRules, overrides, bookedAppointments] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { professionalId, isActive: true }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.availability.findMany({ where: { professionalId }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.availabilityOverride.findMany({ where: { professionalId, date: { gte: fromDay, lt: exclusiveEnd } } }),
    prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ACTIVE_SLOT_STATUSES as any },
        scheduledAt: { gte: fromDay, lt: exclusiveEnd },
      },
      select: { scheduledAt: true },
    }),
  ]);

  const rules = new Map<number, { startTime: string; endTime: string }>();
  for (const rule of legacyRules) rules.set(rule.dayOfWeek, rule);
  for (const rule of newRules) rules.set(rule.dayOfWeek, rule);

  const booked = new Set<string>();
  for (const appointment of bookedAppointments) {
    if (appointment.scheduledAt) booked.add(appointment.scheduledAt.toISOString());
  }

  const days = [];
  for (let cursor = fromDay; cursor <= toDay; cursor = addDays(cursor, 1)) {
    const dayOfWeek = getDayOfWeek(cursor);
    const rule = rules.get(dayOfWeek);
    const dateKey = cursor.toISOString().slice(0, 10);
    const dayOverrides = overrides.filter((override) => override.date.toISOString().slice(0, 10) === dateKey);
    const slots = [];

    if (rule) {
      for (let minutes = toMinutes(rule.startTime); minutes < toMinutes(rule.endTime); minutes += slotIntervalMinutes) {
        const time = toHHMM(minutes);
        const scheduledAt = new Date(`${dateKey}T${time}:00.000-06:00`);
        const blocked = dayOverrides.some((override) => {
          if (override.type !== 'BLOCK') return false;
          if (!override.startTime || !override.endTime) return true;
          return minutes >= toMinutes(override.startTime) && minutes < toMinutes(override.endTime);
        });
        const status: SlotStatus = blocked ? 'BLOCKED' : booked.has(scheduledAt.toISOString()) ? 'BOOKED' : 'AVAILABLE';
        slots.push({ scheduledAt: scheduledAt.toISOString(), time, status });
      }
    }

    for (const override of dayOverrides.filter((item) => item.type === 'EXTRA_AVAILABLE' && item.startTime && item.endTime)) {
      for (let minutes = toMinutes(override.startTime as string); minutes < toMinutes(override.endTime as string); minutes += slotIntervalMinutes) {
        const time = toHHMM(minutes);
        const scheduledAt = new Date(`${dateKey}T${time}:00.000-06:00`);
        if (slots.some((slot) => slot.scheduledAt === scheduledAt.toISOString())) continue;
        slots.push({ scheduledAt: scheduledAt.toISOString(), time, status: booked.has(scheduledAt.toISOString()) ? 'BOOKED' : 'AVAILABLE' });
      }
    }

    days.push({ date: dateKey, dayOfWeek, slots: slots.sort((a, b) => a.time.localeCompare(b.time)) });
  }

  return { professionalId, slotIntervalMinutes, days };
}
