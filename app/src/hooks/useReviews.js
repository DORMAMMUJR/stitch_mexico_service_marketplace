import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useReviews(professionalId) {
  return useQuery({
    queryKey: ['reviews', professionalId],
    queryFn: () => apiFetch(`/professionals/${professionalId}/reviews`),
    enabled: !!professionalId,
  });
}
