/**
 * CRITICAL_FIELDS — Campos que al modificarse requieren re-verificación del profesional.
 * Compartido entre frontend y backend para mantener consistencia.
 */
export const CRITICAL_FIELDS = ['title', 'category'];

/**
 * Campos que pueden editarse sin afectar el estado de verificación.
 */
export const MINOR_FIELDS = ['bio', 'hourlyRate', 'city', 'state'];
