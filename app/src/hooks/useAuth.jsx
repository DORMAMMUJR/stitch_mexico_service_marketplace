import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);
let sessionCheckPromise = null;

async function fetchSessionUser() {
  if (!sessionCheckPromise) {
    sessionCheckPromise = apiFetch('/auth/me')
      .then((data) => data?.user ?? null)
      .catch(() => null)
      .finally(() => {
        setTimeout(() => {
          sessionCheckPromise = null;
        }, 0);
      });
  }

  return sessionCheckPromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, verificar si hay una sesion activa con la cookie HttpOnly
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const sessionUser = await fetchSessionUser();
        if (!cancelled) {
          setUser(sessionUser);
        }
      } finally {
        // isLoading solo pasa a false aqui, por lo que PrivateRoute siempre
        // espera la respuesta del servidor antes de tomar decisiones de rol.
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // Leer localStorage SOLO para pre-poblar la UI rapidamente (reduce flash).
    // NUNCA se usa para autorizacion - isLoading permanece en true hasta
    // que checkSession resuelve y sobreescribe este valor con la fuente de verdad.
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // datos corruptos, ignorar
      }
    }

    // Verificar con el servidor (fuente de verdad)
    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  // Actualiza campos parciales del usuario en tiempo real (ej. avatarUrl)
  const updateUser = useCallback((newData = {}) => {
    if (!newData || typeof newData !== 'object') return;
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...newData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      // Llamar al endpoint de logout para limpiar la cookie HttpOnly del servidor
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Error al cerrar sesion:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token'); // Limpiar cualquier residuo de versiones anteriores
      // La cookie access_token se borra via el endpoint del backend
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
