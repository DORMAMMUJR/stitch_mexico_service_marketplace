import { Role, type AppointmentStatus, type OrderStatus } from '@prisma/client';

type AppointmentLike = {
  id: string;
  status: AppointmentStatus | string;
  notes?: string | null;
  clientId?: string | null;
  professional?: { userId?: string | null } | null;
};

type OrderLike = {
  id: string;
  status: OrderStatus | string;
  clientId: string;
  professional?: { userId?: string | null } | null;
  professionalId?: string | null;
};

type ActorContext = {
  role: string;
  userId: string;
};

type AppointmentMeta = {
  payment?: {
    method?: string;
    status?: string;
  };
};

const APPOINTMENT_STATE_MAP: Record<string, string> = {
  REQUESTED: 'AWAITING_CONFIRMATION',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'SCHEDULED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_SERVICE',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'NO_SHOW',
  CANCELLED: 'CANCELLED',
};

const ORDER_STATE_MAP: Record<string, string> = {
  DRAFT: 'DRAFT',
  PAGO_PENDIENTE: 'PENDING_PAYMENT',
  FONDOS_EN_ESCROW: 'FUNDS_HELD',
  EN_PROGRESO: 'IN_PROGRESS',
  COMPLETADO: 'COMPLETED_AWAITING_PAYOUT',
  EN_DISPUTA: 'IN_DISPUTE',
  PAYOUT_INICIADO: 'PAYOUT_PENDING_MANUAL',
  PAYOUT_COMPLETADO: 'PAYOUT_COMPLETED',
  PAYOUT_FALLIDO: 'PAYOUT_FAILED',
  CANCELADO: 'CANCELLED',
  REEMBOLSADO: 'REFUNDED',
};

function parseAppointmentMeta(notes: string | null | undefined): AppointmentMeta {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as AppointmentMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function canAccessAppointment(appointment: AppointmentLike, actor: ActorContext): boolean {
  const role = String(actor.role || '').toUpperCase();
  if (role === Role.ADMIN) return true;
  if (role === Role.CLIENT) return appointment.clientId === actor.userId;
  if (role === Role.PROFESSIONAL) return appointment.professional?.userId === actor.userId;
  return false;
}

function canAccessOrder(order: OrderLike, actor: ActorContext): boolean {
  const role = String(actor.role || '').toUpperCase();
  if (role === Role.ADMIN) return true;
  if (role === Role.CLIENT) return order.clientId === actor.userId;
  if (role === Role.PROFESSIONAL) return order.professional?.userId === actor.userId;
  return false;
}

export function deriveAppointmentPaymentState(appointment: AppointmentLike): string {
  const status = String(appointment.status || '').toUpperCase();
  const meta = parseAppointmentMeta(appointment.notes);
  const paymentStatus = String(meta.payment?.status || '').toUpperCase();

  if (paymentStatus === 'TRANSFER_SUBMITTED') return 'AWAITING_TRANSFER_VALIDATION';
  if (paymentStatus === 'CHECKOUT_PENDING') return 'CHECKOUT_PENDING';
  if (paymentStatus === 'PAID_HELD') return 'FUNDS_HELD';
  if (paymentStatus === 'PAID_RELEASED') return 'FUNDS_RELEASED';
  if (paymentStatus === 'NO_SHOW_HOLD') return 'NO_SHOW_HOLD';
  if (paymentStatus === 'PAID_SLOT_CONFLICT') return 'SLOT_CONFLICT_REVIEW';
  if (paymentStatus === 'CHECKOUT_FAILED') return 'CHECKOUT_FAILED';
  if (status === 'PENDING_PAYMENT') return 'AWAITING_PAYMENT';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'N/A';
}

export function deriveAppointmentState(statusInput: AppointmentStatus | string): string {
  const status = String(statusInput || '').toUpperCase();
  return APPOINTMENT_STATE_MAP[status] || status || 'UNKNOWN';
}

export function deriveAppointmentNextActions(appointment: AppointmentLike, actor: ActorContext): string[] {
  if (!canAccessAppointment(appointment, actor)) return [];

  const role = String(actor.role || '').toUpperCase();
  const status = String(appointment.status || '').toUpperCase();
  const meta = parseAppointmentMeta(appointment.notes);
  const paymentMethod = String(meta.payment?.method || '').toUpperCase();
  const paymentStatus = String(meta.payment?.status || '').toUpperCase();
  const actions = new Set<string>(['VIEW_TIMELINE']);

  if (['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status)) {
    actions.add('JOIN_VIDEO_CALL');
  }

  if (['REQUESTED', 'CONFIRMED', 'SCHEDULED', 'PENDING_PAYMENT'].includes(status)) {
    actions.add('RESCHEDULE_APPOINTMENT');
    actions.add('CANCEL_APPOINTMENT');
  }

  if (role === Role.PROFESSIONAL || role === Role.ADMIN) {
    if (status === 'PENDING_PAYMENT' && paymentMethod === 'BANK_TRANSFER' && paymentStatus === 'TRANSFER_SUBMITTED') {
      actions.add('VIEW_TRANSFER_PROOF');
      actions.add('CONFIRM_TRANSFER_PAYMENT');
    }

    if (['REQUESTED', 'PENDING_PAYMENT', 'SCHEDULED'].includes(status) && !(paymentMethod === 'BANK_TRANSFER' && paymentStatus === 'TRANSFER_SUBMITTED')) {
      actions.add('CONFIRM_APPOINTMENT');
    }

    if (['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status)) {
      actions.add('COMPLETE_APPOINTMENT');
      actions.add('MARK_NO_SHOW');
    }
  }

  return Array.from(actions);
}

export function normalizeAppointmentForActor<T extends AppointmentLike>(appointment: T, actor: ActorContext): T & {
  state: string;
  paymentState: string;
  nextActions: string[];
} {
  return {
    ...appointment,
    state: deriveAppointmentState(appointment.status),
    paymentState: deriveAppointmentPaymentState(appointment),
    nextActions: deriveAppointmentNextActions(appointment, actor),
  };
}

export function deriveOrderState(statusInput: OrderStatus | string): string {
  const status = String(statusInput || '').toUpperCase();
  return ORDER_STATE_MAP[status] || status || 'UNKNOWN';
}

export function deriveOrderPaymentState(order: OrderLike): string {
  const status = String(order.status || '').toUpperCase();
  if (status === 'DRAFT') return 'NOT_STARTED';
  if (status === 'PAGO_PENDIENTE') return 'AWAITING_PAYMENT';
  if (['FONDOS_EN_ESCROW', 'EN_PROGRESO', 'COMPLETADO', 'EN_DISPUTA', 'PAYOUT_INICIADO'].includes(status)) return 'FUNDS_HELD_PLATFORM';
  if (status === 'PAYOUT_COMPLETADO') return 'PAID_OUT';
  if (status === 'PAYOUT_FALLIDO') return 'PAYOUT_FAILED_MANUAL_REVIEW';
  if (status === 'REEMBOLSADO') return 'REFUNDED';
  if (status === 'CANCELADO') return 'CANCELLED';
  return 'N/A';
}

export function deriveOrderNextActions(order: OrderLike, actor: ActorContext): string[] {
  if (!canAccessOrder(order, actor)) return [];

  const role = String(actor.role || '').toUpperCase();
  const status = String(order.status || '').toUpperCase();
  const actions = new Set<string>(['VIEW_TIMELINE']);

  if (role === Role.CLIENT && ['DRAFT', 'PAGO_PENDIENTE'].includes(status)) {
    actions.add('PAY_CHECKOUT');
    actions.add('CANCEL_ORDER');
  }

  if (role === Role.PROFESSIONAL) {
    if (status === 'FONDOS_EN_ESCROW') actions.add('START_ORDER');
    if (status === 'EN_PROGRESO') actions.add('COMPLETE_ORDER');
  }

  if (role === Role.CLIENT && status === 'COMPLETADO') {
    actions.add('OPEN_DISPUTE');
  }

  if (role === Role.ADMIN) {
    if (status === 'EN_DISPUTA') actions.add('RESOLVE_DISPUTE');
    if (status === 'PAYOUT_INICIADO') {
      actions.add('MARK_PAYOUT_COMPLETED');
      actions.add('MARK_PAYOUT_FAILED');
    }
    if (status === 'PAYOUT_FALLIDO') actions.add('RETRY_PAYOUT');
  }

  return Array.from(actions);
}

export function normalizeOrderForActor<T extends OrderLike>(order: T, actor: ActorContext): T & {
  state: string;
  paymentState: string;
  nextActions: string[];
} {
  return {
    ...order,
    state: deriveOrderState(order.status),
    paymentState: deriveOrderPaymentState(order),
    nextActions: deriveOrderNextActions(order, actor),
  };
}

export function normalizeTimelineEvent<T extends { id: string; createdAt?: Date | string | null; event?: string | null; type?: string | null; actorUserId?: string | null; metadata?: unknown; fromStatus?: string | null; toStatus?: string | null }>(event: T): T & {
  timelineType: string;
  happenedAt: string | null;
} {
  const timelineType = String(event.type || event.event || '').toUpperCase() || 'EVENT';
  const happenedAt = event.createdAt ? new Date(event.createdAt).toISOString() : null;
  return {
    ...event,
    timelineType,
    happenedAt,
  };
}
