import assert from 'node:assert/strict';
import {
  deriveAppointmentNextActions,
  deriveAppointmentPaymentState,
  deriveAppointmentState,
  deriveOrderNextActions,
  deriveOrderPaymentState,
  deriveOrderState,
} from '../src/lib/flowState';

function run() {
  const professionalActor = { role: 'PROFESSIONAL', userId: 'pro-user-1' };
  const clientActor = { role: 'CLIENT', userId: 'client-user-1' };
  const adminActor = { role: 'ADMIN', userId: 'admin-1' };

  const transferPendingAppointment = {
    id: 'appt-1',
    status: 'PENDING_PAYMENT',
    notes: JSON.stringify({ payment: { method: 'BANK_TRANSFER', status: 'TRANSFER_SUBMITTED' } }),
    clientId: 'client-user-1',
    professional: { userId: 'pro-user-1' },
  };

  assert.equal(deriveAppointmentState(transferPendingAppointment.status), 'PENDING_PAYMENT');
  assert.equal(deriveAppointmentPaymentState(transferPendingAppointment as any), 'AWAITING_TRANSFER_VALIDATION');
  assert(deriveAppointmentNextActions(transferPendingAppointment as any, professionalActor).includes('CONFIRM_TRANSFER_PAYMENT'));
  assert(!deriveAppointmentNextActions(transferPendingAppointment as any, clientActor).includes('CONFIRM_TRANSFER_PAYMENT'));

  const scheduledPaidAppointment = {
    id: 'appt-2',
    status: 'SCHEDULED',
    notes: JSON.stringify({ payment: { method: 'STRIPE_CARD', status: 'PAID_HELD' } }),
    clientId: 'client-user-1',
    professional: { userId: 'pro-user-1' },
  };

  const scheduledActions = deriveAppointmentNextActions(scheduledPaidAppointment as any, professionalActor);
  assert.equal(deriveAppointmentPaymentState(scheduledPaidAppointment as any), 'FUNDS_HELD');
  assert(scheduledActions.includes('COMPLETE_APPOINTMENT'));
  assert(scheduledActions.includes('MARK_NO_SHOW'));

  const disputedOrder = {
    id: 'order-1',
    status: 'EN_DISPUTA',
    clientId: 'client-user-1',
    professional: { userId: 'pro-user-1' },
  };

  assert.equal(deriveOrderState(disputedOrder.status), 'IN_DISPUTE');
  assert.equal(deriveOrderPaymentState(disputedOrder as any), 'FUNDS_HELD_PLATFORM');
  assert(deriveOrderNextActions(disputedOrder as any, adminActor).includes('RESOLVE_DISPUTE'));
  assert(!deriveOrderNextActions(disputedOrder as any, clientActor).includes('RESOLVE_DISPUTE'));

  const payoutPendingOrder = {
    id: 'order-2',
    status: 'PAYOUT_INICIADO',
    clientId: 'client-user-1',
    professional: { userId: 'pro-user-1' },
  };

  const payoutActions = deriveOrderNextActions(payoutPendingOrder as any, adminActor);
  assert.equal(deriveOrderState(payoutPendingOrder.status), 'PAYOUT_PENDING_MANUAL');
  assert(payoutActions.includes('MARK_PAYOUT_COMPLETED'));
  assert(payoutActions.includes('MARK_PAYOUT_FAILED'));

  console.log('OK: flow smoke checks passed');
}

run();
