function parseMeta(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const STATUS_PRIORITY = {
  PENDING_PAYMENT: 1,
  REQUESTED: 2,
  CONFIRMED: 3,
  SCHEDULED: 4,
  IN_PROGRESS: 5,
  NO_SHOW: 6,
  COMPLETED: 7,
  CANCELLED: 8,
};

export function normalizeAppointmentsForDashboard(list) {
  if (!Array.isArray(list)) return [];
  return [...list]
    .map((app) => {
      const state = String(app?.state || '').toUpperCase() || String(app?.status || '').toUpperCase();
      const paymentState = String(app?.paymentState || '').toUpperCase();
      return {
        ...app,
        state,
        paymentState,
        nextActions: Array.isArray(app?.nextActions) ? app.nextActions : deriveLocalNextActions(app),
        dateLabel: app?.scheduledAt
          ? new Date(app.scheduledAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Fecha pendiente',
        timeLabel: app?.scheduledAt
          ? new Date(app.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
          : 'Hora por confirmar',
      };
    })
    .sort((a, b) => {
      const aPriority = STATUS_PRIORITY[String(a?.status || '').toUpperCase()] || 99;
      const bPriority = STATUS_PRIORITY[String(b?.status || '').toUpperCase()] || 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const aTime = a?.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b?.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
}

function deriveLocalNextActions(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  const meta = parseMeta(appointment?.notes);
  const method = String(meta?.payment?.method || '').toUpperCase();
  const paymentStatus = String(meta?.payment?.status || '').toUpperCase();
  const actions = ['VIEW_TIMELINE'];
  if (['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status)) actions.push('JOIN_VIDEO_CALL');
  if (status === 'PENDING_PAYMENT' && method === 'BANK_TRANSFER' && paymentStatus === 'TRANSFER_SUBMITTED') {
    actions.push('VIEW_TRANSFER_PROOF', 'CONFIRM_TRANSFER_PAYMENT');
  }
  if (['REQUESTED', 'PENDING_PAYMENT', 'SCHEDULED'].includes(status) && !(method === 'BANK_TRANSFER' && paymentStatus === 'TRANSFER_SUBMITTED')) {
    actions.push('CONFIRM_APPOINTMENT');
  }
  if (['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status)) actions.push('COMPLETE_APPOINTMENT', 'MARK_NO_SHOW');
  if (['REQUESTED', 'CONFIRMED', 'SCHEDULED', 'PENDING_PAYMENT'].includes(status)) actions.push('CANCEL_APPOINTMENT', 'RESCHEDULE_APPOINTMENT');
  return [...new Set(actions)];
}

export function hasAction(appointment, actionId) {
  const actions = Array.isArray(appointment?.nextActions) ? appointment.nextActions : deriveLocalNextActions(appointment);
  return actions.includes(actionId);
}

export function getPaymentSummary(appointment) {
  const paymentState = String(appointment?.paymentState || '').toUpperCase();
  if (paymentState === 'AWAITING_TRANSFER_VALIDATION') {
    return { label: 'Pago por validar', detail: 'Comprobante enviado por cliente' };
  }
  if (paymentState === 'CHECKOUT_PENDING') {
    return { label: 'Pago con tarjeta pendiente', detail: 'Cliente aun no finaliza checkout' };
  }
  if (paymentState === 'FUNDS_HELD') {
    return { label: 'Pago confirmado', detail: 'Fondos retenidos por plataforma' };
  }
  if (paymentState === 'FUNDS_RELEASED') {
    return { label: 'Pago liberado', detail: 'Servicio completado' };
  }
  if (paymentState === 'NO_SHOW_HOLD') {
    return { label: 'No-show retenido', detail: 'Requiere revision administrativa' };
  }
  if (paymentState === 'SLOT_CONFLICT_REVIEW') {
    return { label: 'Pago recibido', detail: 'Conflicto de horario: revision manual' };
  }

  const meta = parseMeta(appointment?.notes);
  const method = String(meta?.payment?.method || '').toUpperCase();
  const status = String(appointment?.status || '').toUpperCase();
  if (status === 'PENDING_PAYMENT' && method === 'BANK_TRANSFER') {
    return { label: 'Pago por validar', detail: 'Comprobante enviado por cliente' };
  }
  return null;
}
