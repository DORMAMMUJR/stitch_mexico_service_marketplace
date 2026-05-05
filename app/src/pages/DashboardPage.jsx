import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { ChatWindow } from '../components/ChatWindow';
import { NavbarIntecnia } from '../components/NavbarIntecnia';

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [availStatus, setAvailStatus] = useState(null); 
  const [updateStatus, setUpdateStatus] = useState(null); 
  const [profileForm, setProfileForm] = useState({
    title: '', category: 'HEALTH_WELLNESS', bio: '', hourlyRate: '', meetLink: ''
  });
  const [stripeStatus, setStripeStatus] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);

  const routerLocation = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(routerLocation.search);
    return params.get('tab') || 'overview';
  });

  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search);
    const tab = params.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [routerLocation.search]);

  const avatarInputRef = React.useRef(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { logout, updateUser } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, _cancelling: true } : a));
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cita cancelada con éxito', 'success');
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'CANCELLED', _cancelling: false } : a));
      } else {
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, _cancelling: false } : a));
        showToast(data.error || 'Error al cancelar la cita', 'error');
      }
    } catch (err) {
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, _cancelling: false } : a));
      showToast('Error de conexión', 'error');
    }
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

  useEffect(() => {
    const fetchDashboard = fetch('/api/professionals/me/dashboard', { credentials: 'include' }).then(res => res.json()).catch(() => ({}));
    const fetchAppointments = fetch('/api/appointments/my', { credentials: 'include' }).then(res => res.json()).catch(() => []);
    const fetchProfile = fetch('/api/professionals/me', { credentials: 'include' }).then(res => res.json()).catch(() => ({}));
    const fetchAvailability = fetch('/api/professionals/me/availability', { credentials: 'include' }).then(res => res.json()).catch(() => []);
    const fetchNotifications = fetch('/api/users/me/notifications', { credentials: 'include' }).then(res => res.json()).catch(() => []);
    const fetchStripeStatus = fetch('/api/orders/stripe-connect/status', { credentials: 'include' }).then(res => res.json()).catch(() => null);

    Promise.all([fetchDashboard, fetchAppointments, fetchProfile, fetchAvailability, fetchNotifications, fetchStripeStatus])
    .then(([dashboardJson, appointmentsJson, profileJson, availabilityJson, notificationsJson, stripeJson]) => {
      if (dashboardJson.user) {
        setData(dashboardJson);
      } else {
        const userName = profileJson?.user?.name || profileJson?.name || 'Profesional';
        setData({
          profileViews: 0,
          profileViewsGrowth: '0%',
          totalInteractions: 0,
          conversionRate: '0%',
          automatedMessages: 0,
          appointmentsScheduled: 0,
          verificationStatus: profileJson?.verificationStatus || 'PENDING',
          user: {
            name: userName,
            title: profileJson?.title || '',
            avatarUrl: profileJson?.user?.avatarUrl || null,
            isVerified: profileJson?.isVerified || false,
          }
        });
      }
      if (Array.isArray(appointmentsJson)) {
        setAppointments(appointmentsJson.map(app => ({
          ...app,
          dateLabel: app.scheduledAt ? new Date(app.scheduledAt).toLocaleDateString('es-MX') : 'Fecha pendiente',
          timeLabel: app.scheduledAt ? new Date(app.scheduledAt).toLocaleTimeString('es-MX') : 'hora por confirmar',
        })).sort((a, b) => new Date(b.scheduledAt || 0).getTime() - new Date(a.scheduledAt || 0).getTime()));
      }
      if (profileJson && profileJson.id) {
        setProfileForm({
          title: profileJson.title || '',
          category: profileJson.category || 'HEALTH_WELLNESS',
          bio: profileJson.bio || '',
          hourlyRate: profileJson.hourlyRate || '',
          meetLink: profileJson.meetLink || ''
        });
        if (profileJson.portfolioItems) setPortfolioItems(profileJson.portfolioItems);
      }
      if (Array.isArray(availabilityJson) && availabilityJson.length > 0) {
        const merged = defaultAvailabilities.map(def => {
          const found = availabilityJson.find(a => a.dayOfWeek === def.dayOfWeek);
          return found ? { ...def, active: true, startTime: found.startTime, endTime: found.endTime } : { ...def, active: false };
        });
        setAvailabilities(merged);
      }
      if (Array.isArray(notificationsJson)) setNotifications(notificationsJson);
      if (stripeJson) setStripeStatus(stripeJson);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await fetch('/api/users/avatar', { method: 'POST', credentials: 'include', body: formData });
      if (response.ok) {
        const result = await response.json();
        setAvatarPreview(result.avatarUrl);
        updateUser({ avatarUrl: result.avatarUrl });
        showToast('¡Foto de perfil actualizada!', 'success');
      }
    } catch (error) { console.error(error); }
  };

  const handlePortfolioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/professionals/me/portfolio', { method: 'POST', credentials: 'include', body: formData });
      if (res.ok) {
        const result = await res.json();
        setPortfolioItems([result.portfolioItem, ...portfolioItems]);
        showToast('¡Imagen subida correctamente!', 'success');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeletePortfolioItem = async (itemId) => {
    if (!confirm('¿Seguro que quieres eliminar esta imagen?')) return;
    try {
      const res = await fetch(`/api/professionals/me/portfolio/${itemId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setPortfolioItems(portfolioItems.filter(item => item.id !== itemId));
        showToast('Imagen eliminada', 'success');
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/professionals/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) showToast('¡Perfil actualizado!', 'success');
    } catch (error) { console.error(error); }
  };

  const handleUpdateAvailability = async () => {
    const toSave = availabilities.filter(a => a.active).map(a => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));
    try {
      const res = await fetch('/api/professionals/me/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilities: toSave })
      });
      if (res.ok) showToast('¡Horarios actualizados!', 'success');
    } catch (error) { console.error(error); }
  };

  if (loading) return <div>Cargando...</div>;
  if (!data) return <div>No hay datos.</div>;

  const { user } = data;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="dashboard" />
      <div className="dashboard-layout" style={{ paddingTop: '1rem' }}>
        <aside className="sidebar" style={{ top: '5rem', height: 'calc(100vh - 5rem)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0.5rem' }}>
            <img 
              src={avatarPreview || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'P')}&background=2dbcfe&color=fff&size=48`} 
              alt={user.name} 
              style={{ width: '3rem', height: '3rem', borderRadius: '50%', objectFit: 'cover' }} 
            />
            <div>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--primary)' }}>{user.name}</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{user.title} • {user.isVerified ? 'Verificado' : 'Pendiente'}</p>
            </div>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button onClick={() => setActiveTab('overview')} className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>dashboard</span> Tablero
            </button>
            <button onClick={() => setActiveTab('profile')} className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span> Perfil
            </button>
            <button onClick={() => setActiveTab('appointments')} className={`sidebar-link ${activeTab === 'appointments' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>event</span> Mis Citas
            </button>
            <button onClick={() => setActiveTab('availability')} className={`sidebar-link ${activeTab === 'availability' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>schedule</span> Disponibilidad
            </button>
            <button onClick={() => setActiveTab('messages')} className={`sidebar-link ${activeTab === 'messages' ? 'active' : ''}`} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forum</span> Mensajes
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          <header className="flex-between" style={{ marginBottom: '3rem' }}>
            <div>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>RESUMEN</p>
              <h1 className="text-display-lg" style={{ color: 'var(--primary)' }}>Panel profesional</h1>
            </div>
          </header>

          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Vistas de perfil (30 días)</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.profileViews}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{data.profileViewsGrowth || '0%'}</p>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Interacciones totales</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.totalInteractions}</p>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Conversión</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.conversionRate}</p>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Mensajes (cliente a cliente)</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.automatedMessages}</p>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Citas agendadas</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{data.appointmentsScheduled}</p>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Mis Citas</h2>
              {appointments.length === 0 ? <p>No hay citas.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {appointments.map(app => (
                    <div key={app.id} style={{ padding: '1rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{app.client?.name || 'Cliente'}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{app.dateLabel} {app.timeLabel}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                          {app.client?.email ? `Contacto: ${app.client.email}` : 'Sin correo visible'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                          {app.client?.isVerified ? 'Cliente verificado' : 'Cliente no verificado'} · {app.client?.isNew ? 'Cliente nuevo' : 'Cliente recurrente'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: app.status === 'SCHEDULED' ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 700 }}>{app.status}</p>
                      </div>
                      {app.status === 'SCHEDULED' && (
                        <button onClick={() => handleCancelAppointment(app.id)} disabled={app._cancelling} className="btn btn-outline">
                          {app._cancelling ? 'Cancelando...' : 'Cancelar cita'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="card" style={{ padding: '2rem' }}>
              <h2>Ajustes de Perfil</h2>
              <form onSubmit={handleUpdateProfile}>
                <input value={profileForm.title} onChange={e => setProfileForm({...profileForm, title: e.target.value})} className="input-field" placeholder="Título" />
                <input value={profileForm.meetLink} onChange={e => setProfileForm({...profileForm, meetLink: e.target.value})} className="input-field" placeholder="https://meet.google.com/..." style={{ marginTop: '0.75rem' }} />
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar</button>
              </form>
            </div>
          )}
          {activeTab === 'availability' && (
            <div className="card" style={{ padding: '2rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Disponibilidad semanal</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Define tus horarios para que el calendario y el bot muestren slots reales.
              </p>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {availabilities.map((slot, idx) => (
                  <div
                    key={slot.dayOfWeek}
                    className="availability-row"
                    style={{
                      border: '1px solid var(--outline-variant)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.75rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
                      gap: '0.75rem',
                      alignItems: 'center',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
                      <input type="checkbox" checked={slot.active} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => i === idx ? { ...it, active: e.target.checked } : it))} />
                      {slot.dayName}
                    </label>
                    <input type="time" value={slot.startTime} disabled={!slot.active} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => i === idx ? { ...it, startTime: e.target.value } : it))} className="input-field" style={{ minWidth: '120px', padding: '0.5rem 0.625rem' }} />
                    <input type="time" value={slot.endTime} disabled={!slot.active} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => i === idx ? { ...it, endTime: e.target.value } : it))} className="input-field" style={{ minWidth: '120px', padding: '0.5rem 0.625rem' }} />
                    <span style={{ fontSize: '0.75rem', color: slot.active ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 700 }}>{slot.active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleUpdateAvailability} className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar disponibilidad</button>
            </div>
          )}

          {activeTab === 'messages' && <ChatWindow />}
        </main>
      </div>
    </div>
  );
}



