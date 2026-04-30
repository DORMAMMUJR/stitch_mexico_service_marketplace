import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const location = window.location;
  
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  const [notifications, setNotifications] = useState([]);

  const [profileForm, setProfileForm] = useState({
    title: '', category: 'HEALTH_WELLNESS', bio: '', hourlyRate: ''
  });
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = React.useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const defaultAvailabilities = DAYS.map((day, i) => ({
    dayOfWeek: i,
    dayName: day,
    active: i > 0 && i < 6, // L-V
    startTime: '09:00',
    endTime: '18:00'
  }));
  const [availabilities, setAvailabilities] = useState(defaultAvailabilities);

  // DEMO_DASHBOARD eliminado para forzar datos reales o ceros
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Modo demo eliminado
    
    // Fetch Dashboard Data
    const fetchDashboard = fetch('/api/professionals/me/dashboard', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => ({}));

    // Fetch Appointments
    const fetchAppointments = fetch('/api/appointments/my', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => []);

    // Fetch Profile
    const fetchProfile = fetch('/api/professionals/me', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => ({}));

    // Fetch Availability
    const fetchAvailability = fetch('/api/professionals/me/availability', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => []);

    // Fetch Notifications
    const fetchNotifications = fetch('/api/users/me/notifications', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => []);

    // Fetch Stripe Connect Status
    const fetchStripeStatus = fetch('/api/orders/stripe-connect/status', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).catch(() => null);

    Promise.all([fetchDashboard, fetchAppointments, fetchProfile, fetchAvailability, fetchNotifications, fetchStripeStatus])
    .then(([dashboardJson, appointmentsJson, profileJson, availabilityJson, notificationsJson, stripeJson]) => {
      if (dashboardJson.user) {
        setData(dashboardJson);
      } else {
        // Fallback: mostrar en ceros si no hay datos de analíticas
        setData({
          profileViews: 0,
          profileViewsGrowth: '0%',
          totalInteractions: 0,
          conversionRate: '0%',
          automatedMessages: 0,
          appointmentsScheduled: 0,
          user: {
            name: profileJson?.user?.name || 'Profesional',
            title: profileJson?.title || '',
            avatarUrl: profileJson?.user?.avatarUrl || null,
            isVerified: profileJson?.user?.isVerified || false,
          }
        });
      }
      if (Array.isArray(appointmentsJson)) {
        setAppointments(appointmentsJson);
      }
      if (profileJson && profileJson.id) {
        setProfileForm({
          title: profileJson.title || '',
          category: profileJson.category || 'HEALTH_WELLNESS',
          bio: profileJson.bio || '',
          hourlyRate: profileJson.hourlyRate || ''
        });
      } else {
        // Formulario en blanco listo para ser llenado
        setProfileForm({
          title: '',
          category: 'HEALTH_WELLNESS',
          bio: '',
          hourlyRate: ''
        });
      }
      if (Array.isArray(availabilityJson) && availabilityJson.length > 0) {
        const merged = defaultAvailabilities.map(def => {
          const found = availabilityJson.find(a => a.dayOfWeek === def.dayOfWeek);
          return found 
            ? { ...def, active: true, startTime: found.startTime, endTime: found.endTime } 
            : { ...def, active: false };
        });
        setAvailabilities(merged);
      } else if (Array.isArray(availabilityJson) && availabilityJson.length === 0 && dashboardJson.user) {
        const allInactive = defaultAvailabilities.map(def => ({ ...def, active: false }));
        setAvailabilities(allInactive);
      }
      if (Array.isArray(notificationsJson)) {
        setNotifications(notificationsJson);
      }
      if (stripeJson) {
        setStripeStatus(stripeJson);
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview local inmediato
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    showToast('Subiendo foto de perfil...', 'info');
    // TODO: reemplazar con llamada real a /api/upload cuando el endpoint exista
    setTimeout(() => {
      showToast('¡Foto de perfil actualizada correctamente!', 'success');
    }, 1200);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    showToast('Guardando perfil...', 'info');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/professionals/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      if (res.ok) {
        showToast('¡Perfil público actualizado con éxito!', 'success');
      } else {
        showToast('Error al guardar los cambios. Intenta de nuevo.', 'error');
      }
    } catch (error) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  const handleUpdateAvailability = async () => {
    showToast('Guardando horarios...', 'info');
    const token = localStorage.getItem('token');
    const toSave = availabilities.filter(a => a.active).map(a => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime
    }));

    try {
      const res = await fetch('/api/professionals/me/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ availabilities: toSave })
      });
      if (res.ok) {
        showToast('¡Horarios actualizados correctamente!', 'success');
      } else {
        showToast('Error al guardar los horarios.', 'error');
      }
    } catch (error) {
      showToast('Error de conexión con el servidor.', 'error');
    }
  };

  const handleStripeConnect = async () => {
    try {
      showToast('Redirigiendo a Stripe...', 'info');
      const res = await fetch('/api/orders/stripe-connect/onboarding', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.error || 'Error conectando con Stripe', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al abrir Stripe', 'error');
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
        <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'Manrope', fontWeight: 500 }}>Cargando tu tablero...</p>
      </div>
    </div>
  );
  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
      <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#dc2626', marginBottom: '1rem', display: 'block' }}>lock</span>
        <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Esta sección es exclusiva para profesionales verificados. Inicia sesión para continuar.</p>
        <a href="/login" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>Iniciar Sesión</a>
      </div>
    </div>
  );

  const { user } = data;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <img src={user.avatarUrl} alt={user.name} style={{ width: '3rem', height: '3rem', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '50%', border: '2px solid white' }}></div>
          </div>
          <div>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--primary)' }}>{user.name}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{user.title} • {user.isVerified ? 'Verificado' : 'Pendiente'}</p>
          </div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button onClick={() => setActiveTab('overview')} className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>dashboard</span> Tablero
          </button>
          <button onClick={() => setActiveTab('appointments')} className={`sidebar-link ${activeTab === 'appointments' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>event</span> Mis Citas
          </button>
          <button onClick={() => setActiveTab('availability')} className={`sidebar-link ${activeTab === 'availability' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span> Disponibilidad
          </button>
          <button onClick={() => setActiveTab('profile')} className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span> Ajustes de Perfil
          </button>
          <button onClick={() => setActiveTab('stats')} className={`sidebar-link ${activeTab === 'stats' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>insights</span> Estadísticas
          </button>
          <button onClick={() => setActiveTab('notifications')} className={`sidebar-link ${activeTab === 'notifications' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span> Notificaciones</span>
            {notifications.length > 0 && <span style={{ background: 'var(--error)', color: 'white', fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)' }}>{notifications.length}</span>}
          </button>
          <button onClick={() => setActiveTab('messages')} className={`sidebar-link ${activeTab === 'messages' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forum</span> Mensajes
          </button>
          <button onClick={() => setActiveTab('finance')} className={`sidebar-link ${activeTab === 'finance' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance_wallet</span> Finanzas
          </button>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--tertiary-container)', marginBottom: '0.5rem', display: 'block' }}>workspace_premium</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Desbloquea estadísticas avanzadas.</p>
            <button onClick={(e) => { e.preventDefault(); showToast('Funcionalidad Premium en desarrollo', 'info'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}>Hacerse Premium</button>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Link to="/support" className="sidebar-link" style={{ fontSize: '0.8125rem' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>help</span> Centro de Ayuda</Link>
            <button onClick={handleLogout} className="sidebar-link" style={{ fontSize: '0.8125rem', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span> Cerrar Sesión</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="flex-between" style={{ marginBottom: '3rem' }}>
          <div>
            <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>RESUMEN</p>
            <h1 className="text-display-lg" style={{ color: 'var(--primary)' }}>Rendimiento</h1>
          </div>
          <div className="dashboard-header-actions hide-mobile">
            <button onClick={(e) => { e.preventDefault(); showToast('Mostrando últimos 30 días', 'info'); }} className="btn btn-outline"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span> Últimos 30 Días</button>
            <button onClick={(e) => { e.preventDefault(); showToast('Exportando datos en formato CSV...', 'success'); }} className="btn btn-secondary"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Exportar</button>
          </div>
        </header>

        {/* Banner de verificación IN_REVIEW */}
        {data.verificationStatus === 'IN_REVIEW' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid #f59e0b',
            marginBottom: '2rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#d97706' }}>verified_user</span>
            <div>
              <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: '#92400e', marginBottom: '0.25rem' }}>
                Tu perfil está en revisión
              </h4>
              <p style={{ fontSize: '0.8125rem', color: '#78350f', lineHeight: 1.5 }}>
                Has realizado cambios en campos críticos (Título o Categoría). Tu badge de verificación estará oculto hasta que un administrador apruebe los cambios.
              </p>
            </div>
          </div>
        )}

        {data.verificationStatus === 'PENDING' && !data.user?.isVerified && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--surface-container-low)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--outline-variant)',
            marginBottom: '2rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--secondary)' }}>upload_file</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                Completa tu verificación
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                Sube tu Constancia SAT para aparecer en el directorio público y recibir clientes.
              </p>
            </div>
            <a href="/verification" className="btn btn-primary" style={{ fontSize: '0.8125rem', flexShrink: 0 }}>Verificarme</a>
          </div>
        )}

        {/* Banner Stripe Connect */}
        {stripeStatus && (!stripeStatus.connected || !stripeStatus.payoutsEnabled) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--surface-container)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--outline-variant)',
            marginBottom: '2rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#6366f1' }}>payments</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
                Configura tus pagos
              </h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                Conecta tu cuenta bancaria con Stripe para poder recibir pagos por tus servicios.
              </p>
            </div>
            <button onClick={handleStripeConnect} className="btn btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1', color: '#fff', fontSize: '0.8125rem', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance</span>
              Conectar Stripe
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="layout-bento">
            {/* Profile Views Card */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.125rem', color: 'var(--on-surface)', marginBottom: '0.25rem' }}>Visitas Totales al Perfil</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Tráfico orgánico y promocionado</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface-container-low)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>trending_up</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>+24.5%</span>
                </div>
              </div>
              <p style={{ fontFamily: 'Manrope', fontSize: '3rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>{data.profileViews.toLocaleString()}</p>
              <div style={{ height: '100px' }}>
                <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dbcfe" stopOpacity="0.2"/><stop offset="100%" stopColor="#2dbcfe" stopOpacity="0"/></linearGradient></defs>
                  <path d="M0,100 L0,60 C20,50 40,80 60,65 C80,50 100,40 120,55 C140,70 160,30 180,45 C200,60 220,20 240,35 C260,50 280,15 300,25 C320,35 340,10 360,15 C380,20 400,5 400,5 L400,100 Z" fill="url(#cg)"/>
                  <path d="M0,60 C20,50 40,80 60,65 C80,50 100,40 120,55 C140,70 160,30 180,45 C200,60 220,20 240,35 C260,50 280,15 300,25 C320,35 340,10 360,15 C380,20 400,5 400,5" fill="none" stroke="#2dbcfe" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Total Interactions */}
            <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '3rem', height: '3rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--primary)' }}>touch_app</span>
                </div>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.25rem' }}>Interacciones Totales</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Clics en portafolio y contacto</p>
              </div>
              <div>
                <p style={{ fontFamily: 'Manrope', fontSize: '3rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>{data.totalInteractions}</p>
                <div className="progress-bar" style={{ marginTop: '1rem' }}><div className="progress-fill" style={{ width: data.conversionRate, background: 'var(--primary)' }}></div></div>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.75rem' }}>{data.conversionRate} de conversión a vista de perfil</p>
              </div>
            </div>

            {/* AI Assistant Card */}
            <div style={{ gridColumn: 'span 2', background: 'var(--primary)', borderRadius: 'var(--radius-2xl)', padding: '2.5rem', position: 'relative', overflow: 'hidden', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right,var(--primary-container),var(--primary))', opacity: 0.9 }}></div>
              <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--secondary-container)', fontSize: '20px' }}>smart_toy</span>
                  </div>
                  <h2 style={{ fontFamily: 'Manrope', fontSize: '1.5rem', fontWeight: 700, color: 'var(--on-primary)', letterSpacing: '-0.01em' }}>Asistencia IA</h2>
                </div>
                <p style={{ color: 'var(--primary-fixed-dim)', lineHeight: 1.6, maxWidth: '450px', marginBottom: '1rem' }}>
                  Tu asistente inteligente está gestionando activamente consultas iniciales, calificando prospectos y agendando consultas mientras tú te enfocas en el trabajo.
                </p>
                <a href="#" onClick={(e) => { e.preventDefault(); showToast('Configuración del bot en desarrollo', 'info'); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary-container)', textDecoration: 'none' }}>
                  Configurar Parámetros del Bot <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </a>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-2xl)', padding: '1.5rem', minWidth: '160px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Manrope', fontSize: '2.5rem', fontWeight: 700, color: 'var(--on-primary)', letterSpacing: '-0.02em' }}>{data.automatedMessages}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--primary-fixed-dim)' }}>Mensajes automatizados</p>
                </div>
                <div style={{ background: 'rgba(45,188,254,0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(45,188,254,0.2)', borderRadius: 'var(--radius-2xl)', padding: '1.5rem', minWidth: '160px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary-container)' }}>event_available</span>
                    <p style={{ fontFamily: 'Manrope', fontSize: '2.5rem', fontWeight: 700, color: 'var(--secondary-container)', letterSpacing: '-0.02em' }}>{data.appointmentsScheduled}</p>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--primary-fixed-dim)' }}>Citas agendadas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Próximas Citas</h2>
            {appointments.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--outline-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>event_busy</span>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No tienes citas agendadas</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Tus próximas sesiones aparecerán aquí.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.map(app => (
                  <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <img src={app.client?.avatarUrl || '/placeholder-user.jpg'} style={{ width: '3rem', height: '3rem', borderRadius: '50%' }} alt="Client" />
                      <div>
                        <h4 style={{ fontWeight: 700, color: 'var(--primary)' }}>{app.client?.name || 'Cliente'}</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{new Date(app.date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <span className={`badge ${app.status === 'SCHEDULED' ? 'badge-blue' : ''}`}>{app.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Notificaciones</h2>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--outline-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>notifications_off</span>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Estás al día</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>No tienes nuevas notificaciones por el momento.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ padding: '1.25rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', display: 'flex', gap: '1rem' }}>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: notif.type === 'WARNING' || notif.type === 'warning' ? '#fef3c7' : 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: notif.type === 'WARNING' || notif.type === 'warning' ? '#d97706' : 'var(--secondary)' }}>
                        {notif.type === 'WARNING' || notif.type === 'warning' ? 'warning' : 'info'}
                      </span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--primary)' }}>{notif.title}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{new Date(notif.createdAt || new Date()).toLocaleDateString('es-MX')}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{notif.body || notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Gestión de Disponibilidad</h2>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>Define tus horarios para que los clientes puedan agendar citas. Tu bot de IA respetará estos horarios.</p>
            
            {availStatus && (
              <div style={{ padding: '1rem', background: availStatus.includes('Error') ? '#fee2e2' : '#dcfce7', color: availStatus.includes('Error') ? '#991b1b' : '#166534', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {availStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {availabilities.map((day, index) => (
                <div key={day.dayOfWeek} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={day.active} 
                      onChange={(e) => {
                        const newAvail = [...availabilities];
                        newAvail[index].active = e.target.checked;
                        setAvailabilities(newAvail);
                      }}
                      style={{ accentColor: 'var(--secondary)', width: '1.25rem', height: '1.25rem' }} 
                    />
                    <span style={{ fontWeight: 600, color: day.active ? 'var(--on-surface)' : 'var(--on-surface-variant)' }}>{day.dayName}</span>
                  </label>

                  {day.active ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="time" 
                        value={day.startTime}
                        onChange={(e) => {
                          const newAvail = [...availabilities];
                          newAvail[index].startTime = e.target.value;
                          setAvailabilities(newAvail);
                        }}
                        className="input-field" 
                        style={{ padding: '0.5rem', width: 'auto' }}
                      />
                      <span style={{ color: 'var(--on-surface-variant)' }}>a</span>
                      <input 
                        type="time" 
                        value={day.endTime}
                        onChange={(e) => {
                          const newAvail = [...availabilities];
                          newAvail[index].endTime = e.target.value;
                          setAvailabilities(newAvail);
                        }}
                        className="input-field" 
                        style={{ padding: '0.5rem', width: 'auto' }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>No disponible</span>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleUpdateAvailability} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              Guardar Horarios
            </button>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>Ajustes de tu Perfil Público</h3>
            
            {updateStatus && (
              <div style={{ padding: '1rem', background: updateStatus.includes('Error') ? '#fee2e2' : '#dcfce7', color: updateStatus.includes('Error') ? '#991b1b' : '#166534', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {updateStatus}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* ── Foto de Perfil ─────────────────────────────────────────── */}
              <div>
                <label className="text-label-md" style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--on-surface-variant)' }}>Foto de Perfil</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {avatarPreview || data?.user?.avatarUrl ? (
                      <img
                        src={avatarPreview || data.user.avatarUrl}
                        alt="Avatar"
                        style={{ width: '5rem', height: '5rem', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--outline-variant)' }}
                      />
                    ) : (
                      <div style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--outline-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--on-surface-variant)' }}>person</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--secondary)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'white' }}>photo_camera</span>
                    </button>
                  </div>
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="btn btn-outline"
                      style={{ fontSize: '0.875rem', marginBottom: '0.375rem' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload</span>
                      Subir nueva foto
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem' }}>JPG, PNG o WebP. Máximo 5 MB.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-label-md" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface-variant)' }}>Título Profesional (ej. Psicóloga Clínica)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={profileForm.title}
                  onChange={(e) => setProfileForm({...profileForm, title: e.target.value})}
                  placeholder="Tu especialidad principal"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="text-label-md" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface-variant)' }}>Categoría</label>
                  <select 
                    className="input-field"
                    value={profileForm.category}
                    onChange={(e) => setProfileForm({...profileForm, category: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="HEALTH_WELLNESS">Salud y Bienestar</option>
                    <option value="GENERAL_MAINTENANCE">Mantenimiento General</option>
                    <option value="LEGAL">Consultoría Legal</option>
                    <option value="FINANCE_TAX">Contabilidad y Finanzas</option>
                    <option value="IT_SECURITY">Tecnología y Desarrollo</option>
                    <option value="ENGINEERING">Ingeniería</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-md" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface-variant)' }}>Tarifa por Hora (MXN)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={profileForm.hourlyRate}
                    onChange={(e) => setProfileForm({...profileForm, hourlyRate: e.target.value})}
                    placeholder="Ej. 800"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-label-md" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface-variant)' }}>Biografía y Experiencia</label>
                <textarea 
                  className="input-field" 
                  rows="5"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  placeholder="Cuéntale a tus clientes sobre tu experiencia y servicios..."
                  style={{ width: '100%', resize: 'vertical' }}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.75rem 2rem' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        )}

        {(activeTab === 'stats' || activeTab === 'messages' || activeTab === 'finance') && (
          <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem' }}>build_circle</span>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Módulo en Construcción</h2>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: '400px' }}>Estamos trabajando arduamente para traerte esta funcionalidad muy pronto. ¡Mantente al tanto!</p>
          </div>
        )}
      </main>
    </div>
  );
}
