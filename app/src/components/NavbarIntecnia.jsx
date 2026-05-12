import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NOTIFICATION_POLL_MS = 60_000;

const getNotificationIcon = (type) => {
  const normalizedType = String(type || '').toUpperCase();
  if (normalizedType.includes('APPOINTMENT')) return 'event';
  if (normalizedType.includes('MESSAGE') || normalizedType.includes('CHAT')) return 'chat';
  if (normalizedType.includes('PAYMENT') || normalizedType.includes('ORDER')) return 'payments';
  return 'notifications';
};

const formatRelativeTime = (value) => {
  if (!value) return 'hace un momento';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'hace un momento';

  const diffMs = Date.now() - date.getTime();
  const absMs = Math.abs(diffMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (absMs < minuteMs) return 'hace unos segundos';
  if (absMs < hourMs) return `hace ${Math.floor(absMs / minuteMs)} min`;
  if (absMs < dayMs) return `hace ${Math.floor(absMs / hourMs)} h`;
  return `hace ${Math.floor(absMs / dayMs)} d`;
};

const normalizeNotifications = (payload) => {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.notifications)
      ? payload.notifications
      : [];

  return raw.slice(0, 5).map((n, index) => ({
    id: n?.id ?? `notification-${index}`,
    type: n?.type || 'GENERIC',
    title: n?.title || n?.body || n?.message || 'Nueva notificación',
    createdAt: n?.createdAt || n?.created_at || new Date().toISOString(),
    read: Boolean(n?.read ?? n?.isRead),
  }));
};

const sampleNotifications = () => ([
  { id: 'sample-1', type: 'MESSAGE', title: 'Tienes un nuevo mensaje', createdAt: new Date(Date.now() - 5 * 60_000).toISOString(), read: false },
  { id: 'sample-2', type: 'APPOINTMENT', title: 'Cita confirmada para hoy', createdAt: new Date(Date.now() - 25 * 60_000).toISOString(), read: true },
]);

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
  const notificationsEndpointRef = useRef(null);

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

  const fetchNotifications = useCallback(async ({ showLoader = false, fallbackToSample = false } = {}) => {
    if (!isAuthenticated) {
      setNotifs([]);
      return;
    }

    if (showLoader) setNotifsLoading(true);

    try {
      const defaultEndpoints = ['/api/notifications?limit=5', '/api/users/me/notifications?limit=5'];
      const endpoints = notificationsEndpointRef.current
        ? [notificationsEndpointRef.current, ...defaultEndpoints.filter((endpoint) => endpoint !== notificationsEndpointRef.current)]
        : defaultEndpoints;
      let data = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { credentials: 'include' });
          if (!res.ok) continue;
          data = await res.json();
          notificationsEndpointRef.current = endpoint;
          break;
        } catch {
          // intentar siguiente endpoint
        }
      }

      if (data) {
        setNotifs(normalizeNotifications(data));
      } else if (fallbackToSample) {
        setNotifs(sampleNotifications());
      }
    } finally {
      if (showLoader) setNotifsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    fetchNotifications();
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(intervalId);
  }, [isAuthenticated, fetchNotifications]);

  const handleNotifToggle = async () => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen) {
      await fetchNotifications({ showLoader: true, fallbackToSample: true });
    }
  };

  const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/dashboard';
  const publishServicePath = !isAuthenticated
    ? '/register?role=professional'
    : user?.role === 'CLIENT'
      ? '/dashboard/verification'
      : '/verification';

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
            <Link to="/marketplace" className={`nav-link ${activePage === 'marketplace' ? 'active' : ''}`}>Inicio</Link>
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
                <Link to={publishServicePath} className="btn btn-primary hide-mobile" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Ofrecer Servicios</Link>
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
                      width: 'min(320px, calc(100vw - 1rem))',
                      maxWidth: '320px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      background: 'var(--surface-container)',
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
                              background: n.read ? 'transparent' : 'var(--surface-container-low)',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }}>
                              {getNotificationIcon(n.type)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: '0.25rem' }}>
                                {n.title}
                              </p>
                              <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                                {formatRelativeTime(n.createdAt)}
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
              <Link to="/register?role=professional" className="btn btn-outline" style={{ borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>Publicar mi servicio</Link>
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
        <Link to="/marketplace" className="nav-link" onClick={() => setMobileOpen(false)}>Inicio</Link>
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
                <Link to={publishServicePath} className="nav-link" onClick={() => setMobileOpen(false)}>Ofrecer Servicios</Link>
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
            <Link to="/register?role=professional" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={() => setMobileOpen(false)}>Publicar mi servicio</Link>
          </>
        ) : (
          <Link to="/register?role=professional" className="nav-link" style={{ color: 'var(--secondary)' }} onClick={() => setMobileOpen(false)}>Publicar servicio</Link>
        )}
      </div>
    </nav>
  );
}
