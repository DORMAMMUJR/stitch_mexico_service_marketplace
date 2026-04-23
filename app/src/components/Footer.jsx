import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>KonectIA</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', maxWidth: '280px' }}>
              © 2024 KonectIA. La Institución Digital de Servicios Profesionales. Innovando el mercado laboral profesional.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              <Link to="/privacy" style={{ transition: 'color 0.2s' }}>Política de Privacidad</Link>
+              <Link to="/terms" style={{ transition: 'color 0.2s' }}>Términos de Servicio</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
              <Link to="/escrow">Garantía Escrow</Link>
+              <Link to="/sat-compliance" style={{ textDecoration: 'underline' }}>Cumplimiento SAT</Link>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.04)', fontSize: '0.6875rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          PROFESIONALES VERIFICADOS
        </div>
      </div>
    </footer>
  );
}
