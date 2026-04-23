import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary)' }}>hub</span>
          <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>Intecnia</span>
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', marginLeft: '0.5rem' }}>© 2026 Todos los derechos reservados</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
          <Link to="#" style={{ color: 'var(--on-surface-variant)', transition: 'color 0.2s' }}>Privacidad</Link>
          <Link to="#" style={{ color: 'var(--on-surface-variant)', transition: 'color 0.2s' }}>Términos</Link>
          <Link to="#" style={{ color: 'var(--on-surface-variant)', transition: 'color 0.2s' }}>Soporte</Link>
        </div>
      </div>
    </footer>
  );
}
