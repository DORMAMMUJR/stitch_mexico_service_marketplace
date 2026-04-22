import React from 'react';
import { Link } from 'react-router-dom';

export function NavbarIntecnia({ activePage = 'marketplace' }) {
  const links = [
    { label: 'Marketplace', id: 'marketplace', route: '/' },
    { label: 'Services', id: 'services', route: '/directory' },
    { label: 'Consultants', id: 'consultants', route: '/categories' },
    { label: 'Enterprise', id: 'enterprise', route: '/' },
  ];

  return (
    <header className="nav-top" id="nav-intecnia">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.03em', cursor: 'pointer', textDecoration: 'none' }}>Intecnia</Link>
          <nav style={{ display: 'flex', gap: '0.25rem' }} className="hide-mobile">
            {links.map(l => (
              <Link 
                key={l.id} 
                to={l.route} 
                className={`nav-link${l.id === activePage ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>search</span>
            <input type="text" placeholder="Search professionals." style={{ background: 'transparent', fontSize: '0.8125rem', width: '140px', color: 'var(--on-surface)', border: 'none', outline: 'none' }} />
          </div>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background='var(--surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.background='transparent'}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
          </button>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background='var(--surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.background='transparent'}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
          </button>
          <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.background='var(--surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.background='transparent'}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
          </button>
          <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-primary)' }}>person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
