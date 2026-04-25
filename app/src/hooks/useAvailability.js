import { useState, useEffect } from 'react';

export function useAvailability(professionalId) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!professionalId) return;

    setIsLoading(true);
    fetch(`/api/appointments/availability/${professionalId}`)
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar disponibilidad');
        return res.json();
      })
      .then(json => {
        setData(json);
        setError(null);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [professionalId]);

  return { data, isLoading, error };
}
