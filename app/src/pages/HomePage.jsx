import React from 'react';
import { Link } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function HomePage() {
  return (
    <>
      <NavbarIntecnia activePage="marketplace" />

      {/* Hero Section */}
      <section className="hero-gradient" style={{ padding: '8rem 1.5rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <p className="text-label-md animate-in stagger-1" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--secondary)', marginBottom: '1.5rem' }}>
          LA INSTITUCIÓN DIGITAL
        </p>
        <h1 className="animate-in stagger-2" style={{ fontFamily: 'Manrope', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, maxWidth: '800px', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
          ¿Qué profesional buscas hoy?
        </h1>
        <p className="animate-in stagger-3" style={{ fontSize: '1.125rem', color: 'var(--on-surface-variant)', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
          Conecta con la red más autorizada de México de consultores verificados, expertos legales y especialistas técnicos.
        </p>

        {/* Search Bar */}
        <div className="hero-search-container animate-in stagger-4" style={{ maxWidth: '600px', margin: '0 auto', borderRadius: 'var(--radius-xl)', padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, padding: '0 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>search</span>
            <input type="text" placeholder="Ej. Psicóloga, Abogado Fiscal, Ingeniero..." style={{ flex: 1, padding: '1rem 0', fontSize: '1rem', color: 'var(--primary)', background: 'transparent', border: 'none', outline: 'none' }} id="hero-search" />
          </div>
          <Link to="/directory" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', padding: '0.875rem 2rem', fontWeight: 600 }}>
            BUSCAR
          </Link>
        </div>
      </section>

      {/* Trust & Compliance Bar */}
      <div className="trust-bar animate-in stagger-4">
        <span className="trust-item" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', color: 'var(--secondary)' }}>CONFIANZA TOTAL</span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified_user</span>
          Cumplimiento SAT
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>fingerprint</span>
          Seguridad Biométrica
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>shield</span>
          Identidades 100% Verificadas
        </span>
      </div>

      {/* Explore Expertise Section */}
      <section style={{ padding: '5rem 1.5rem 6rem' }} className="container">
        <div className="animate-in stagger-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Explora Especialidades</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '1rem' }}>Perfiles altamente validados para proyectos corporativos.</p>
          </div>
          <Link to="/categories" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            VER DIRECTORIO <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
          </Link>
        </div>

        {/* Category Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
          {/* Featured: Legal */}
          <div className="cat-card animate-in stagger-2" style={{ gridColumn: 'span 2', padding: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', backgroundImage: 'radial-gradient(circle at right, var(--surface-container-low), var(--surface-container-lowest))' }}>
            <div>
              <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined icon-filled">gavel</span>
              </div>
              <h3 className="text-headline-md" style={{ color: 'var(--primary)' }}>Legal y Cumplimiento</h3>
              <p style={{ color: 'var(--on-surface-variant)', marginTop: '0.5rem', maxWidth: '400px', fontSize: '0.875rem' }}>Derecho corporativo, auditorías fiscales, propiedad intelectual y regulaciones laborales manejadas por firmas de alto nivel.</p>
            </div>
            <Link to="/directory" className="btn btn-secondary" style={{ padding: '0.75rem 2rem' }}>Explorar Abogados</Link>
          </div>

          {/* Finance & Tax */}
          <Link to="/directory" className="cat-card animate-in stagger-3" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', padding: '2rem' }}>
            <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)' }}>
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>Finanzas e Impuestos</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Contadores certificados, asesores financieros y expertos en gestión patrimonial.</p>
          </Link>

          {/* Engineering */}
          <Link to="/directory" className="cat-card animate-in stagger-3" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', padding: '2rem' }}>
            <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)' }}>
              <span className="material-symbols-outlined">engineering</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>Ingeniería</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Consultores en ingeniería civil, estructural e industrial.</p>
          </Link>

          {/* IT & Security */}
          <Link to="/directory" className="cat-card animate-in stagger-4" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', padding: '2rem' }}>
            <div className="cat-icon" style={{ background: 'var(--tertiary-container)', color: 'var(--tertiary)' }}>
              <span className="material-symbols-outlined">security</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>TI y Seguridad</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Arquitectos de sistemas, auditores de ciberseguridad y especialistas en datos.</p>
          </Link>

          {/* Enterprise CTA */}
          <Link to="/categories" className="animate-in stagger-5" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.25rem', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.3s ease' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--secondary)' }}>groups</span>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.125rem', color: 'var(--primary)' }}>¿Necesitas un equipo a medida?</h3>
            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOLUCIONES EMPRESARIALES</button>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
