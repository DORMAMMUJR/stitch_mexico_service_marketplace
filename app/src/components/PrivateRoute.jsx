import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * PrivateRoute - Protege rutas segun autenticacion, rol y completitud de perfil.
 */
export function PrivateRoute({ children, allowedRoles, requireCompleteProfile = false }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
        }}
      >
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
          <p
            style={{
              color: 'var(--on-surface-variant)',
              fontFamily: 'Manrope',
              fontWeight: 500,
            }}
          >
            Verificando sesion...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const attemptedPath = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem('redirectTo', attemptedPath);
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  if (requireCompleteProfile && user?.role === 'PROFESSIONAL' && user?.profileComplete === false) {
    return <Navigate to="/verification" replace />;
  }

  return children;
}
