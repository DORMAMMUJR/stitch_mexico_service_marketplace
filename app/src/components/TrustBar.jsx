import React from 'react';

export function TrustBar() {
  const logos = ['CONCANACO', 'SAT COMPLIANCE', 'ISO 9001', 'MEXICO TECH', 'AMVO'];
  
  return (
    <div style={{ background: 'var(--surface-container)', padding: '1.5rem 2rem', textAlign: 'center' }}>
      <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)', marginBottom: '1rem' }}>
        AVALADO POR PROFESIONALES EXPERTOS
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {logos.map(t => (
          <span key={t} style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.875rem', color: 'var(--on-surface-variant)', opacity: 0.5, letterSpacing: '0.02em' }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
