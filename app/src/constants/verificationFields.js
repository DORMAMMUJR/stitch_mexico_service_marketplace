/**
 * CRITICAL_FIELDS - Campos que al modificarse requieren re-verificacion del profesional.
 * Compartido entre frontend y backend para mantener consistencia.
 */
export const CRITICAL_FIELDS = ['title', 'category'];

/**
 * Campos que pueden editarse sin afectar el estado de verificacion.
 */
export const MINOR_FIELDS = ['bio', 'hourlyRate', 'city', 'state'];

/**
 * Categorias health-first disponibles para profesionales.
 */
export const CATEGORIES = {
  PSYCHOLOGY: 'Psicologia',
  MEDICINE: 'Medicina',
  WELLNESS: 'Bienestar',
};

export const DEFAULT_PROFESSIONAL_CATEGORY = 'PSYCHOLOGY';
