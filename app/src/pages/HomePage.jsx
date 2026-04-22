import React from 'react';
import { Link } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function HomePage() {
  return (
    <>
      <NavbarIntecnia activePage="marketplace" />

      {/* Hero Section */}
      <section className="hero-gradient" style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center', color: 'var(--on-primary)' }}>
        <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary-fixed-dim)', marginBottom: '1rem' }}>
          THE DIGITAL INSTITUTION
        </p>
        <h1 style={{ fontFamily: 'Manrope', fontSize: 'clamp(2.25rem,5vw,3.5rem)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, maxWidth: '700px', margin: '0 auto 1.25rem' }}>
          ¿Qué profesional buscas hoy?
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--primary-fixed-dim)', maxWidth: '520px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Connect with Mexico's most authoritative network of verified consultants, legal experts, and technical specialists.
        </p>
        {/* Search Bar */}
        <div style={{ maxWidth: '560px', margin: '0 auto', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', padding: '0.5rem', display: 'flex', alignItems: 'center', boxShadow: 'var(--ambient-shadow-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, padding: '0 1rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '20px' }}>search</span>
            <input type="text" placeholder="e.g. Abogado Fiscal, Consultor IT, Ingeniero..." style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.875rem', color: 'var(--on-surface)', background: 'transparent', border: 'none', outline: 'none' }} id="hero-search" />
          </div>
          <Link to="/directory" className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)', padding: '0.625rem 1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            SEARCH <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* Trust & Compliance Bar */}
      <div className="trust-bar">
        <span className="trust-item" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>TRUST & COMPLIANCE</span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified_user</span>
          SAT Compliant
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>fingerprint</span>
          Biometric Security
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>shield</span>
          100% Verified Identities
        </span>
      </div>

      {/* Explore Expertise Section */}
      <section style={{ padding: '4rem 1.5rem' }} className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>Explore Expertise</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Browse vetted professionals by institutional category.</p>
          </div>
          <Link to="/categories" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', textDecoration: 'none' }}>
            VIEW ALL CATEGORIES <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          </Link>
        </div>

        {/* Category Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem' }}>
          {/* Legal & Compliance (Large) */}
          <div className="cat-card" style={{ gridColumn: 'span 2', padding: '2rem', background: 'var(--surface-container-low)', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
            <div className="cat-icon" style={{ background: 'rgba(45,188,254,0.1)', color: 'var(--secondary)', position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
              <span className="material-symbols-outlined icon-filled">gavel</span>
            </div>
            <div style={{ position: 'absolute', right: '1.5rem', bottom: '1.5rem', opacity: 0.06, fontSize: '8rem', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>balance</span>
            </div>
            <h3 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Legal & Compliance</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', maxWidth: '380px' }}>Corporate law, tax audits, intellectual property, and labor regulations handled by top-tier firms.</p>
          </div>

          {/* Finance & Tax */}
          <Link to="/directory" className="cat-card" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
            <div className="cat-icon" style={{ background: 'rgba(10,29,55,0.06)', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined">account_balance</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>Finance & Tax</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Certified accountants, financial advisors, and wealth management experts.</p>
          </Link>

          {/* Engineering */}
          <Link to="/directory" className="cat-card" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
            <div className="cat-icon" style={{ background: 'rgba(10,29,55,0.06)', color: 'var(--primary)' }}>
              <span className="material-symbols-outlined">engineering</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>Engineering</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Civil, structural, and industrial engineering consultants.</p>
          </Link>

          {/* IT & Security */}
          <Link to="/directory" className="cat-card" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}>
            <div className="cat-icon" style={{ background: 'rgba(231,83,29,0.08)', color: 'var(--on-tertiary-container)' }}>
              <span className="material-symbols-outlined">security</span>
            </div>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>IT & Security</h3>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>Systems architects, cybersecurity auditors, and data specialists.</p>
          </Link>

          {/* Enterprise CTA */}
          <Link to="/categories" style={{ background: 'var(--primary)', borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1rem', cursor: 'pointer', textDecoration: 'none' }}>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.125rem', color: 'var(--on-primary)' }}>Need a bespoke team?</h3>
            <button className="btn" style={{ background: 'var(--surface-container-lowest)', color: 'var(--primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none' }}>ENTERPRISE SOLUTIONS</button>
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
