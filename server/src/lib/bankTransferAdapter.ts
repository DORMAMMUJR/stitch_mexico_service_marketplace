export type CanonicalBankTransferWebhook = {
  appointmentId: string;
  transferReference: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  providerTxId: string | null;
  status: 'PAID' | 'COMPLETED';
  provider: string;
  rawStatus: string;
};

type AdaptedWebhookResult =
  | { ok: true; data: CanonicalBankTransferWebhook; ignored?: false }
  | { ok: true; ignored: true; reason: 'status_not_paid' }
  | { ok: false; statusCode: number; error: string };

const PAID_STATUSES = new Set([
  'PAID',
  'COMPLETED',
  'SUCCESS',
  'SUCCEEDED',
  'CONFIRMED',
  'APPROVED',
  'SETTLED',
]);

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function readPath(input: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, input);
}

function firstString(input: Record<string, unknown>, paths: string[]): string {
  for (const path of paths) {
    const value = readPath(input, path);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function firstNumber(input: Record<string, unknown>, paths: string[]): number {
  for (const path of paths) {
    const value = readPath(input, path);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function normalizeStatus(rawStatus: string): 'PAID' | 'COMPLETED' | 'PENDING' {
  const normalized = rawStatus.trim().toUpperCase();
  if (!normalized) return 'PAID';
  if (!PAID_STATUSES.has(normalized)) return 'PENDING';
  return normalized === 'COMPLETED' ? 'COMPLETED' : 'PAID';
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  return normalized || 'MXN';
}

function normalizePaidAt(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const asDate = new Date(normalized);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString();
}

export function adaptBankTransferWebhook(payload: unknown): AdaptedWebhookResult {
  const root = asObject(payload);
  const source = asObject(root.data) && Object.keys(asObject(root.data)).length > 0
    ? asObject(root.data)
    : root;
  const candidate = asObject(source.object) && Object.keys(asObject(source.object)).length > 0
    ? asObject(source.object)
    : source;

  const merged = {
    ...root,
    ...source,
    ...candidate,
    metadata: asObject(candidate.metadata),
  } as Record<string, unknown>;

  const rawStatus = firstString(merged, ['status', 'paymentStatus', 'payment_status', 'eventStatus', 'event_status']);
  const normalizedStatus = normalizeStatus(rawStatus);
  if (normalizedStatus === 'PENDING') {
    return { ok: true, ignored: true, reason: 'status_not_paid' };
  }

  const appointmentId = firstString(merged, [
    'appointmentId',
    'appointment_id',
    'metadata.appointmentId',
    'metadata.appointment_id',
    'referenceData.appointmentId',
  ]);

  const transferReference = firstString(merged, [
    'transferReference',
    'transfer_reference',
    'reference',
    'bankReference',
    'bank_reference',
    'paymentReference',
    'metadata.transferReference',
    'metadata.reference',
  ]);

  const amount = (() => {
    const direct = firstNumber(merged, ['amount', 'totalAmount', 'paymentAmount']);
    if (direct > 0) return direct;
    const cents = firstNumber(merged, ['amountCents', 'amount_cents', 'total_amount_cents']);
    return cents > 0 ? cents / 100 : 0;
  })();

  const currency = normalizeCurrency(firstString(merged, ['currency', 'currencyCode', 'currency_code', 'metadata.currency']) || 'MXN');
  const providerTxId = firstString(merged, ['providerTxId', 'provider_tx_id', 'transactionId', 'transaction_id', 'id']) || null;
  const paidAt = normalizePaidAt(firstString(merged, ['paidAt', 'paid_at', 'processedAt', 'processed_at', 'completedAt', 'completed_at']));
  const provider = firstString(merged, ['provider', 'source', 'origin']) || 'bank-transfer-provider';

  if (!appointmentId || !transferReference) {
    return { ok: false, statusCode: 400, error: 'appointmentId y transferReference son obligatorios.' };
  }

  if (!amount || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, statusCode: 400, error: 'amount debe ser un numero positivo.' };
  }

  return {
    ok: true,
    ignored: false,
    data: {
      appointmentId,
      transferReference,
      amount,
      currency,
      paidAt,
      providerTxId,
      status: normalizedStatus,
      provider,
      rawStatus: rawStatus || normalizedStatus,
    },
  };
}
