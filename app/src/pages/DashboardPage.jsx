import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'appointments', 'availability'

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Fetch Dashboard Data
    const fetchDashboard = fetch('/api/professionals/me/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());

    // Fetch Appointments
    const fetchAppointments = fetch('/api/appointments/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json());

    Promise.all([fetchDashboard, fetchAppointments])
    .then(([dashboardJson, appointmentsJson]) => {
      if (dashboardJson.user) {
        setData(dashboardJson);
      }
      if (Array.isArray(appointmentsJson)) {
        setAppointments(appointmentsJson);
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Cargando tablero...</div>;
  if (!data) return <div style={{ padding: '2rem' }}>No autorizado. Inicia sesión como profesional.</div>;

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
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>insights</span> Estadísticas</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forum</span> Mensajes</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance_wallet</span> Finanzas</Link>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--tertiary-container)', marginBottom: '0.5rem', display: 'block' }}>workspace_premium</span>
            <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Desbloquea estadísticas avanzadas.</p>
+            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}>Hacerse Premium</button>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Link to="#" className="sidebar-link" style={{ fontSize: '0.8125rem' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>help</span> Centro de Ayuda</Link>
+            <Link to="/" className="sidebar-link" style={{ fontSize: '0.8125rem' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span> Cerrar Sesión</Link>
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
            <button className="btn btn-outline"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span> Últimos 30 Días</button>
            <button className="btn btn-secondary"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Exportar</button>
          </div>
        </header>

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
                <Link to="#" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary-container)', textDecoration: 'none' }}>
                  Configurar Parámetros del Bot <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </Link>
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
              <p style={{ color: 'var(--on-surface-variant)' }}>No tienes citas agendadas todavía.</p>
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

        {activeTab === 'availability' && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Gestión de Disponibilidad</h2>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>Define tus horarios para que los clientes puedan agendar citas.</p>
            {/* Aquí iría el formulario de disponibilidad */}
            <div style={{ background: 'var(--surface-container)', padding: '2rem', borderRadius: 'var(--radius-2xl)', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem' }}>construction</span>
              <p>Módulo de configuración de horarios en desarrollo.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
