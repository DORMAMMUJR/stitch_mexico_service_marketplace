import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

/**
 * Hook de disponibilidad — migrado a React Query (P1).
 *
 * Ventajas sobre el patron anterior (fetch manual):
 * - Re-fetch automatico cuando cambia professionalId
 * - Cache compartida: si dos componentes usan el mismo professionalId,
 *   solo se hace UNA peticion al servidor
 * - refetch() exportado: AvailabilitySelector lo llama tras un booking
 *   para que los slots se actualicen sin recargar la pagina
 * - credentials:'include' via apiFetch — la cookie HttpOnly se envia correctamente
 *
 * @param {string|null} professionalId
 * @returns {{ data: Array|Object, isLoading: boolean, error: Error|null, refetch: Function }}
 */
export function useAvailability(professionalId) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['availability', professionalId],
    queryFn:  () => apiFetch(`/appointments/availability/${professionalId}/effective`),
    enabled:  !!professionalId,
    staleTime: 1000 * 60 * 2,  // 2 min — la disponibilidad puede cambiar frecuentemente
    gcTime:    1000 * 60 * 5,  // 5 min en cache inactiva
    select: (json) => (Array.isArray(json) || Array.isArray(json?.days) ? json : []),
  });

  return {
    data:      data ?? [],
    isLoading,
    error,
    refetch,   // Llamar tras booking exitoso para refrescar slots
  };
}
