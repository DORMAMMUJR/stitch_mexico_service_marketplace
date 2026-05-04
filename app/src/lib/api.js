// En dev: Vite proxea /api → localhost:3000 (ver vite.config.js)
// En prod (Seenode): mismo origen, Express maneja /api directamente
const BASE_URL = '/api';

/**
 * Cliente API centralizado con interceptor de 401.
 * Todas las peticiones incluyen credentials para enviar/recibir cookies HttpOnly.
 * Si el servidor responde 401, limpia la sesión y redirige al login.
 */
export async function apiFetch(endpoint, options = {}) {
  const config = {
    ...options,
    credentials: 'include', // Enviar cookies HttpOnly automáticamente
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Remover Content-Type si es FormData (para upload de archivos)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // Interceptor 401: sesión expirada o no autenticado
  if (response.status === 401) {
    // Limpiar datos locales de sesión
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Redirigir al login si no estamos ya ahí, Y no es una verificación silenciosa
    if (!window.location.pathname.includes('/login') && !endpoint.includes('/auth/me')) {
      window.location.href = '/login';
    }

    throw new Error('Sesión expirada o no autenticada.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.message || 'Error en la solicitud');
  }

  // Si la respuesta es 204 (No Content), no intentar parsear JSON
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Shorthand helpers
 */
export const api = {
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => apiFetch(endpoint, { method: 'POST', body: formData }),
};
