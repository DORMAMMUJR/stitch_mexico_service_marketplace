// En dev: Vite proxea /api -> localhost:3000 (ver vite.config.js)
// En prod: mismo origen, Express maneja /api directamente.
const BASE_URL = '/api';

function normalizeEndpoint(endpoint) {
  if (!endpoint) return '';
  return endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;
}

export async function apiFetch(endpoint, options = {}) {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const config = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${normalizedEndpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    if (!window.location.pathname.includes('/login') && !normalizedEndpoint.includes('/auth/me')) {
      window.location.href = '/login';
    }

    throw new Error('Sesion expirada o no autenticada.');
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorPayload = {};
    let textPayload = '';

    if (contentType.includes('application/json')) {
      errorPayload = await response.json().catch(() => ({}));
    } else {
      textPayload = await response.text().catch(() => '');
    }

    const resolvedMessage = errorPayload?.error
      || errorPayload?.message
      || textPayload
      || `Error HTTP ${response.status}`;

    throw new Error(String(resolvedMessage).trim() || `Error HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
  upload: (endpoint, formData) => apiFetch(endpoint, { method: 'POST', body: formData }),
};
