import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export function NavbarKonectia() {
  const location = useLocation();
  const activePage = location.pathname.substring(1) || 'directory';

  const links = [
    { label: 'Directory', id: 'directory', route: '/directory' },
    { label: 'Categories', id: 'categories', route: '/categories' },
    { label: 'Trust Center', id: 'trust', route: '/verification' },
  ];

  return (
    <header className="nav-top" id="nav-konectia">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.03em', cursor: 'pointer' }}>
            KonectIA
          </Link>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>search</span>
            <input type="text" placeholder="Buscar profesionales..." style={{ background: 'transparent', fontSize: '0.8125rem', width: '160px', color: 'var(--on-surface)' }} />
          </div>
          <nav style={{ display: 'flex', gap: '0.25rem' }} className="hide-mobile">
            {links.map(l => (
              <Link key={l.id} to={l.route} className={`nav-link${l.id === activePage || l.route === location.pathname ? ' active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
          </button>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
          </button>
          <Link to="/directory" className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}>Find Service</Link>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--surface-container)' }}>
            <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=50&h=50&fit=crop&crop=face" alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>
      </div>
    </header>
  );
}
