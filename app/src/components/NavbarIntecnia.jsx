import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function NavbarIntecnia({ activePage }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Cerrar el dropdown al hacer click fuera de él
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await logout();
    // logout() limpia el estado; navigate asegura la redirección
    navigate('/login');
  };

  // Ruta del dashboard según rol
  const dashboardPath =
    user?.role === 'ADMIN' ? '/admin' :
    user?.role === 'CLIENT' ? '/mis-solicitudes' :
    '/dashboard';

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
              {/* Botón de acceso rápido según rol (desktop) */}
              {user?.role === 'PROFESSIONAL' && (
                <Link to="/dashboard" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
                  Dashboard
                </Link>
              )}
              {user?.role === 'CLIENT' && (
                <Link to="/mis-solicitudes" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
                  Mis Citas
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
                  Panel Admin
                </Link>
              )}

              {/* Ícono de notificaciones — punto rojo solo si hay notificaciones no leídas */}
              <Link
                to={`${dashboardPath}?tab=notifications`}
                style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', position: 'relative', textDecoration: 'none' }}
                title="Notificaciones"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                {user?.hasUnreadNotifications && (
                  <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--surface-container-lowest)' }} />
                )}
              </Link>

              {/* Avatar con dropdown de perfil (desktop) */}
              <div
                ref={dropdownRef}
                className="hide-mobile"
                style={{ position: 'relative', marginLeft: '0.5rem', borderLeft: '1px solid var(--outline-variant)', paddingLeft: '1rem' }}
              >
                <button
                  id="navbar-profile-btn"
                  onClick={() => setProfileOpen(prev => !prev)}
                  aria-haspopup="true"
                  aria-expanded={profileOpen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius-lg)',
                    transition: 'background 0.15s ease',
                  }}
                  title="Mi cuenta"
                >
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    background: 'var(--secondary-container)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--on-secondary-container)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: profileOpen ? '2px solid var(--secondary)' : '2px solid transparent',
                    transition: 'border-color 0.15s ease',
                  }}>
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user?.name?.charAt(0)?.toUpperCase() || 'U')
                    }
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)', transition: 'transform 0.2s ease', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
                </button>

                {/* Dropdown flotante */}
                {profileOpen && (
                  <div
                    id="navbar-profile-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.75rem)',
                      right: 0,
                      minWidth: '220px',
                      background: 'var(--surface-container-lowest)',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-xl)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      overflow: 'hidden',
                      zIndex: 1000,
                      animation: 'fadeInDown 0.15s ease',
                    }}
                  >
                    {/* Cabecera del dropdown */}
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.125rem' }}>
                        {user?.name || 'Usuario'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        {user?.email || ''}
                      </p>
                    </div>

                    {/* Opciones del menú */}
                    <div style={{ padding: '0.5rem' }}>
                      <Link
                        to={user?.role === 'PROFESSIONAL' ? '/dashboard?tab=profile' : '/verification'}
                        onClick={() => setProfileOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--on-surface)',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'background 0.1s ease',
                        }}
                        className="dropdown-item"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>person</span>
                        Mi Perfil
                      </Link>

                      <Link
                        to={dashboardPath}
                        onClick={() => setProfileOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--on-surface)',
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'background 0.1s ease',
                        }}
                        className="dropdown-item"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>dashboard</span>
                        {user?.role === 'ADMIN' ? 'Panel Admin' : user?.role === 'CLIENT' ? 'Mis Citas' : 'Dashboard'}
                      </Link>

                      <div style={{ height: '1px', background: 'var(--outline-variant)', margin: '0.375rem 0' }} />

                      <button
                        id="navbar-logout-btn"
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.625rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--error)',
                          background: 'none',
                          border: 'none',
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'background 0.1s ease',
                        }}
                        className="dropdown-item"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
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
            {user?.role === 'PROFESSIONAL' && (
              <>
                <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link to="/dashboard?tab=profile" className="nav-link" onClick={() => setMobileOpen(false)}>Mi Perfil</Link>
              </>
            )}
            {user?.role === 'CLIENT' && <Link to="/mis-solicitudes" className="nav-link" onClick={() => setMobileOpen(false)}>Mis Citas</Link>}
            {user?.role === 'ADMIN' && <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>Panel Admin</Link>}
            <button
              onClick={handleLogout}
              className="nav-link"
              style={{ textAlign: 'left', border: 'none', background: 'none', width: '100%', color: '#dc2626', cursor: 'pointer' }}
            >
              Cerrar Sesión
            </button>
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
