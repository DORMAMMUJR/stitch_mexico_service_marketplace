import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useProfile(id, clientId, guestId) {
  return useQuery({
    queryKey: ['profile', id, clientId, guestId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (clientId) params.set('clientId', clientId);
      if (guestId) params.set('guestId', guestId);
      const query = params.toString();
      return apiFetch(`/professionals/${id}${query ? `?${query}` : ''}`);
    },
    enabled: !!id,
  });
}
