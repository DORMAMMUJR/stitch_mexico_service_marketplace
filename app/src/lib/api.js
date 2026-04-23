// En dev: Vite proxea /api → localhost:3000 (ver vite.config.js)
// En prod (Seenode): mismo origen, Express maneja /api directamente
const BASE_URL = '/api';

export async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || 'Network response was not ok');
  }

  return response.json();
}
