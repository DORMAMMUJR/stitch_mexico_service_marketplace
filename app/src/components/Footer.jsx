import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Footer() {
  const { isAuthenticated, user } = useAuth();
  const publishServicePath = !isAuthenticated
    ? '/register?role=professional'
    : user?.role === 'CLIENT'
      ? '/dashboard/verification'
      : '/verification';

  return (
    <footer className="footer">
      <div className="container">
        {/* Fila superior: logo + links */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary-fixed-dim)' }}>hub</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--on-primary)', fontSize: '1rem' }}>Intecnia</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
            <Link to="/directory" style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}>Directorio</Link>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}>Privacidad</Link>
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}>Terminos</Link>
            <a href="mailto:soporte@intecnia.mx" style={{ color: 'rgba(255,255,255,0.7)', transition: 'color 0.2s' }}>Soporte</a>
          </div>
        </div>

        {/* Fila inferior: copyright + CTA alineado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>&copy; 2026 Intecnia - Todos los derechos reservados</span>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              to={publishServicePath}
              className="btn btn-full-mobile"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--on-primary)', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.8125rem', padding: '0.5rem 1.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_business</span>
              Publicar servicio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
