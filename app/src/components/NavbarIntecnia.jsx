import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function NavbarIntecnia({ activePage, showAuthActions = true }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNotifToggle = async () => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen && notifs.length === 0) {
      setNotifsLoading(true);
      try {
        const res = await fetch('/api/users/me/notifications?limit=5', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setNotifs(Array.isArray(data) ? data : data.notifications || []);
        }
      } catch (_) {
        // noop
      } finally {
        setNotifsLoading(false);
      }
    }
  };

  const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <nav className="nav-top">
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: 'var(--secondary)' }}>hub</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intecnia</span>
          </Link>
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="hide-mobile">
            <Link to="/" className={`nav-link ${activePage === 'home' ? 'active' : ''}`}>Inicio</Link>
            <Link to="/directory" className={`nav-link ${activePage === 'directory' ? 'active' : ''}`}>Directorio</Link>
            <Link to="/marketplace" className={`nav-link ${activePage === 'marketplace' ? 'active' : ''}`}>Marketplace</Link>
            <Link to="/categories" className={`nav-link ${activePage === 'categories' ? 'active' : ''}`}>Categorías</Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <>
              {user?.role === 'PROFESSIONAL' && (
                <Link to="/dashboard" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Dashboard</Link>
              )}
              {user?.role === 'CLIENT' && (
                <Link to="/verification" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Ofrecer Servicios</Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Super Admin</Link>
              )}

              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  id="navbar-notif-btn"
                  onClick={handleNotifToggle}
                  style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
                  title="Notificaciones"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span>
                  {(user?.hasUnreadNotifications || notifs.some(n => !n.read)) && (
                    <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)', border: '2px solid var(--surface-container-lowest)' }} />
                  )}
                </button>

                {notifOpen && (
                  <div
                    id="navbar-notif-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.75rem)',
                      right: 0,
                      width: '320px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      background: 'var(--surface-container-lowest)',
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-xl)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      zIndex: 1000,
                      animation: 'fadeInDown 0.15s ease',
                    }}
                  >
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>Notificaciones</p>
                      {notifs.length > 0 && (
                        <button
                          onClick={async () => {
                            setNotifs(prev => prev.map(n => ({ ...n, read: true })));
                            await fetch('/api/users/me/notifications/read-all', { method: 'PATCH', credentials: 'include' });
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--secondary)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Marcar todas leídas
                        </button>
                      )}
                    </div>

                    {notifsLoading ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', display: 'block', marginBottom: '0.5rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                        <span style={{ fontSize: '0.8125rem' }}>Cargando...</span>
                      </div>
                    ) : notifs.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '0.5rem' }}>notifications_none</span>
                        Estás al día
                      </div>
                    ) : (
                      <div>
                        {notifs.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '0.875rem 1.25rem',
                              borderBottom: '1px solid var(--outline-variant)',
                              display: 'flex',
                              gap: '0.75rem',
                              alignItems: 'flex-start',
                              background: n.read ? 'transparent' : 'rgba(45,188,254,0.04)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }}>
                              {n.type === 'APPOINTMENT' ? 'event' : n.type === 'MESSAGE' ? 'chat' : 'info'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '0.25rem' }}>
                                {n.body || n.message || n.title}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                                {n.createdAt ? new Date(n.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                            </div>
                            {!n.read && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)', flexShrink: 0, marginTop: '5px' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div ref={dropdownRef} className="hide-mobile" style={{ position: 'relative', marginLeft: '0.5rem', borderLeft: '1px solid var(--outline-variant)', paddingLeft: '1rem' }}>
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
                  }}>
                    {user?.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user?.name?.charAt(0)?.toUpperCase() || 'U')}
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-surface-variant)', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                </button>

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
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)' }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.125rem' }}>{user?.name || 'Usuario'}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{user?.email || ''}</p>
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      <Link to={user?.role === 'PROFESSIONAL' ? '/dashboard?tab=profile' : '/mis-solicitudes'} onClick={() => setProfileOpen(false)} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--on-surface)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>person</span>
                        Mi Perfil
                      </Link>
                      <Link to={dashboardPath} onClick={() => setProfileOpen(false)} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--on-surface)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>dashboard</span>
                        {user?.role === 'ADMIN' ? 'Super Admin' : user?.role === 'CLIENT' ? 'Mis Citas' : 'Dashboard'}
                      </Link>
                      <div style={{ height: '1px', background: 'var(--outline-variant)', margin: '0.375rem 0' }} />
                      <button
                        id="navbar-logout-btn"
                        onClick={handleLogout}
                        className="dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--error)', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : showAuthActions ? (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/login" className="btn" style={{ fontSize: '0.8125rem', color: 'var(--on-surface)' }}>Iniciar Sesión</Link>
              <Link to="/register" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Regístrate</Link>
            </div>
          ) : (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link to="/register?role=professional" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Publicar servicio</Link>
            </div>
          )}
          <button className="hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{mobileOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Inicio</Link>
        <Link to="/directory" className="nav-link" onClick={() => setMobileOpen(false)}>Directorio</Link>
        <Link to="/marketplace" className="nav-link" onClick={() => setMobileOpen(false)}>Marketplace</Link>
        <Link to="/categories" className="nav-link" onClick={() => setMobileOpen(false)}>Categorías</Link>

        {isAuthenticated ? (
          <>
            {user?.role === 'PROFESSIONAL' && (
              <>
                <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link to="/dashboard?tab=profile" className="nav-link" onClick={() => setMobileOpen(false)}>Mi Perfil</Link>
              </>
            )}
            {user?.role === 'CLIENT' && (
              <>
                <Link to="/verification" className="nav-link" onClick={() => setMobileOpen(false)}>Ofrecer Servicios</Link>
                <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Mis Citas</Link>
              </>
            )}
            {user?.role === 'ADMIN' && <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>Super Admin</Link>}
            <button onClick={handleLogout} className="nav-link" style={{ textAlign: 'left', border: 'none', background: 'none', width: '100%', color: '#dc2626', cursor: 'pointer' }}>Cerrar Sesión</button>
          </>
        ) : showAuthActions ? (
          <>
            <Link to="/login" className="nav-link" onClick={() => setMobileOpen(false)}>Iniciar Sesión</Link>
            <Link to="/register" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={() => setMobileOpen(false)}>Crear Cuenta</Link>
          </>
        ) : (
          <Link to="/register?role=professional" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={() => setMobileOpen(false)}>Publicar servicio</Link>
        )}
      </div>
    </nav>
  );
}

