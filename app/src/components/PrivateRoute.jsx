import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * PrivateRoute — Protege rutas según autenticación, rol y completitud de perfil.
 *
 * Props:
 * - children:              el componente a renderizar si la autenticación pasa
 * - allowedRoles:          array de roles permitidos (ej. ['PROFESSIONAL', 'ADMIN'])
 *                          Si no se especifica, solo se verifica autenticación.
 * - requireCompleteProfile: si es true y el usuario es PROFESSIONAL con perfil
 *                          incompleto, se redirige a /verification (onboarding).
 */
export function PrivateRoute({ children, allowedRoles, requireCompleteProfile = false }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Skeleton de carga mientras se verifica la sesión con el servidor
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

  // Bloqueo de onboarding: PROFESSIONAL con perfil incompleto → /verification
  // profileComplete viene del backend (/api/auth/me) y es undefined para no-profesionales.
  // Solo bloqueamos si: la ruta lo requiere, el usuario es profesional,
  // y el backend confirmó que profileComplete === false (no undefined).
  if (
    requireCompleteProfile &&
    user?.role === 'PROFESSIONAL' &&
    user?.profileComplete === false
  ) {
    return <Navigate to="/verification" replace />;
  }

  return children;
}
