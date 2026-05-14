const HANDOFF_KEYWORDS = [
  'quiero que me contacten',
  'quiero hablar con',
  'hablar con',
  'llamame',
  'whatsapp',
  'seguimiento',
  'contactenme',
  'contactarme',
  'contactar',
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function detectHandoffIntent(userMessage) {
  const normalized = normalizeText(userMessage);
  if (!normalized) return false;
  return HANDOFF_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword)));
}

export function getGuidedFallbackReply(professionalName) {
  const name = professionalName || 'este profesional';
  return `Ahora mismo no pude consultar al asistente inteligente. Para avanzar, usa el calendario visible arriba en el perfil de ${name} y elige dia y horario disponible para agendar tu cita.`;
}

export function shouldSendHandoffSummary({ summarySent, nextAction, userMessage }) {
  if (summarySent) return false;
  if (nextAction === 'HANDOFF_HUMAN') return true;
  return detectHandoffIntent(userMessage);
}

export function buildHandoffSummary({ professionalName, messages, lastUserMessage }) {
  const name = professionalName || 'profesional';
  const recent = Array.isArray(messages)
    ? messages
        .filter((m) => m?.sender === 'user' && typeof m?.text === 'string')
        .slice(-3)
        .map((m) => m.text.trim())
        .filter(Boolean)
    : [];
  const summaryLines = recent.length > 0 ? recent.join(' | ') : (lastUserMessage || '').trim();

  return `Solicitud de seguimiento desde el asistente IA de perfil (${name}). Resumen cliente: ${summaryLines || 'El cliente pidio contacto humano.'}.`;
}

