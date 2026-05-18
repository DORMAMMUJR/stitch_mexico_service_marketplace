/**
 * CRITICAL_FIELDS — Campos que al modificarse requieren re-verificación del profesional.
 * Si un profesional verificado cambia alguno de estos campos, su estado
 * pasa automáticamente a IN_REVIEW y su badge de verificación se oculta
 * hasta que un administrador apruebe los cambios.
 *
 * Campos menores (bio, hourlyRate, city, state) pueden cambiarse libremente.
 */
export const CRITICAL_FIELDS = ['title', 'category'];

/**
 * Campos que pueden editarse sin afectar el estado de verificación.
 */
export const MINOR_FIELDS = ['bio', 'hourlyRate', 'city', 'state', 'latitude', 'longitude'];

export const PROFESSIONAL_CATEGORIES = ['PSYCHOLOGY', 'MEDICINE', 'WELLNESS'] as const;

export const DEFAULT_PROFESSIONAL_CATEGORY = 'PSYCHOLOGY';

export function normalizeProfessionalCategory(value: unknown) {
  const normalized = String(value || DEFAULT_PROFESSIONAL_CATEGORY).trim().toUpperCase();
  return PROFESSIONAL_CATEGORIES.includes(normalized as any) ? normalized : null;
}
