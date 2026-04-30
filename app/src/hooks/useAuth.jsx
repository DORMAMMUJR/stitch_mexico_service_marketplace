import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, verificar si hay una sesión activa con la cookie HttpOnly
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiFetch('/auth/me');
        setUser(data.user);
      } catch (err) {
        // No hay sesión activa o cookie expirada
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Primero intentar cargar del localStorage como caché local
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // datos corruptos, ignorar
      }
    }

    // Verificar con el servidor (fuente de verdad)
    checkSession();
  }, []);

  const login = useCallback((token, userData) => {
    // Guardar datos del usuario en localStorage como caché
    localStorage.setItem('user', JSON.stringify(userData));
    // El token ahora viene como cookie HttpOnly, pero mantenemos compatibilidad
    if (token) {
      localStorage.setItem('token', token);
    }
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Llamar al endpoint de logout para limpiar la cookie HttpOnly del servidor
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
