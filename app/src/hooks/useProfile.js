import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useProfile(id) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => apiFetch(`/professionals/${id}`),
    enabled: !!id,
  });
}
