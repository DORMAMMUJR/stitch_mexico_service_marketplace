import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useProfile(id, guestId) {
  return useQuery({
    queryKey: ['profile', id, guestId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (guestId) params.set('guestId', guestId);
      const query = params.toString();
      return apiFetch(`/professionals/${id}${query ? `?${query}` : ''}`);
    },
    enabled: !!id,
  });
}
