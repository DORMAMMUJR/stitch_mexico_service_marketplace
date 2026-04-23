import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export function NavbarIntecnia({ activePage }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="nav-top">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: 'var(--secondary)' }}>hub</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intecnia</span>
          </Link>
          <div style={{ display: 'flex', gap: '0.25rem' }} className="hide-mobile">
            <Link to="/" className={`nav-link ${activePage === 'marketplace' ? 'active' : ''}`}>Marketplace</Link>
            <Link to="/directory" className={`nav-link ${activePage === 'directory' ? 'active' : ''}`}>Directorio</Link>
            <Link to="/categories" className={`nav-link ${activePage === 'categories' ? 'active' : ''}`}>Categorías</Link>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/dashboard" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
            Dashboard
          </Link>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', border: 'none', background: 'transparent', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
            <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', border: '2px solid var(--surface-container-lowest)' }}></span>
          </button>
          {/* Hamburger */}
          <button className="hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Marketplace</Link>
        <Link to="/directory" className="nav-link" onClick={() => setMobileOpen(false)}>Directorio</Link>
        <Link to="/categories" className="nav-link" onClick={() => setMobileOpen(false)}>Categorías</Link>
        <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
      </div>
    </nav>
  );
}
