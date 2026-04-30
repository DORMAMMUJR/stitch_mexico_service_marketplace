import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * PrivateRoute — Protege rutas según autenticación y rol.
 * 
 * Props:
 * - children: el componente a renderizar si la autenticación pasa
 * - allowedRoles: array de roles permitidos (ej. ['PROFESSIONAL', 'ADMIN'])
 *   Si no se especifica, solo se verifica que el usuario esté autenticado.
 */
export function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Skeleton de carga mientras se verifica la sesión
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '48px',
              color: 'var(--secondary)',
              animation: 'spin 1s linear infinite',
              display: 'block',
              marginBottom: '1rem',
            }}
          >
            progress_activity
          </span>
          <p style={{
            color: 'var(--on-surface-variant)',
            fontFamily: 'Manrope',
            fontWeight: 500,
          }}>
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  // No autenticado → al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles requeridos, verificar que el usuario tenga uno de ellos
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
