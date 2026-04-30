/**
 * CRITICAL_FIELDS — Campos que al modificarse requieren re-verificación del profesional.
 * Compartido entre frontend y backend para mantener consistencia.
 */
export const CRITICAL_FIELDS = ['title', 'category'];

/**
 * Campos que pueden editarse sin afectar el estado de verificación.
 */
export const MINOR_FIELDS = ['bio', 'hourlyRate', 'city', 'state'];

/**
 * Categorías disponibles para los profesionales.
 */
export const CATEGORIES = {
  LEGAL: 'Legal',
  FINANCE_TAX: 'Finanzas e Impuestos',
  ENGINEERING: 'Ingeniería',
  IT_SECURITY: 'TI y Seguridad',
  PLUMBING: 'Plomería',
  ELECTRICAL: 'Electricidad',
  HVAC: 'Climatización (HVAC)',
  GENERAL_MAINTENANCE: 'Mantenimiento General',
  HEALTH_WELLNESS: 'Salud y Bienestar'
};
