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
