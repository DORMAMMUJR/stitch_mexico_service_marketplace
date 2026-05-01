import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface)',
      fontFamily: 'Manrope',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '64px', color: 'var(--secondary)', marginBottom: '1rem' }}
      >
        search_off
      </span>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
        404
      </h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', fontWeight: 600 }}>
        Página no encontrada
      </p>
      <p style={{ fontSize: '0.9375rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', maxWidth: '380px', lineHeight: 1.6 }}>
        La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
      </p>
      <Link to="/" className="btn btn-primary" style={{ fontSize: '0.9375rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
        Volver al inicio
      </Link>
    </div>
  );
}
