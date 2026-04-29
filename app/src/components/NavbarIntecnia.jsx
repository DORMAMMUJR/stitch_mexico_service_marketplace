import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function NavbarIntecnia({ activePage }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
                Dashboard
              </Link>
              <Link to="/dashboard?tab=notifications" style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', position: 'relative', textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--surface-container-lowest)' }}></span>
              </Link>
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--outline-variant)', paddingLeft: '1rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-secondary-container)', fontWeight: 600, fontSize: '0.8125rem' }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <button onClick={handleLogout} style={{ border: 'none', background: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Cerrar Sesión">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn" style={{ fontSize: '0.8125rem', color: 'var(--on-surface)' }}>Iniciar Sesión</Link>
              <Link to="/register" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Regístrate</Link>
            </div>
          )}
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
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
            <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="nav-link" style={{ textAlign: 'left', border: 'none', background: 'none', width: '100%', color: '#dc2626' }}>Cerrar Sesión</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link" onClick={() => setMobileOpen(false)}>Iniciar Sesión</Link>
            <Link to="/register" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={() => setMobileOpen(false)}>Crear Cuenta</Link>
          </>
        )}
      </div>
    </nav>
  );
}
