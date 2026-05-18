export const APPOINTMENT_TIME_ZONE = 'America/Mexico_City';

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: APPOINTMENT_TIME_ZONE,
  weekday: 'short',
});

const HHMM_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APPOINTMENT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function parseScheduledAt(raw: unknown): Date | null {
  if (!raw) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getDayOfWeek(date: Date): number {
  const key = WEEKDAY_FORMATTER.format(date).toLowerCase();
  return WEEKDAY_INDEX[key] ?? date.getDay();
}

export function getSlotTimeHHMM(date: Date): string {
  return HHMM_FORMATTER.format(date);
}

export function parseProfessionalSlotInterval(value: unknown): 20 | 30 | 45 {
  const parsed = Number(value);
  if (parsed === 20 || parsed === 30 || parsed === 45) return parsed;
  return 30;
}

export function isValidSlotForInterval(date: Date, intervalMinutes: number): boolean {
  return date.getMinutes() % intervalMinutes === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function startOfLocalDay(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return new Date(`${parts}T00:00:00.000-06:00`);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
