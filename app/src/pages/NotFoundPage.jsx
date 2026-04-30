import React from 'react';
import { Link } from 'react-router-dom';
import NavbarIntecnia from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="" />
      
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '480px',
        }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '80px',
              color: 'var(--secondary)',
              display: 'block',
              marginBottom: '1.5rem',
            }}
          >
            explore_off
          </span>
          <h1 style={{
            fontFamily: 'Manrope',
            fontSize: '4rem',
            fontWeight: 800,
            color: 'var(--primary)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.03em',
          }}>
            404
          </h1>
          <p style={{
            color: 'var(--on-surface-variant)',
            fontSize: '1.125rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            La página que buscas no existe o fue movida. Pero no te preocupes, puedes volver al inicio.
          </p>
          <Link
            to="/"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderRadius: 'var(--radius-xl)',
              padding: '0.875rem 2rem',
              fontSize: '1rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>home</span>
            Volver al Inicio
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
