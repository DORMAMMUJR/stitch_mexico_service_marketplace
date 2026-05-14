import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { ChatWindow } from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';
import { VideoCallModal } from '../components/VideoCallModal';

export function ClientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [joiningVideoMap, setJoiningVideoMap] = useState({});
  const [activeVideoSession, setActiveVideoSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const publishServicePath = !isAuthenticated
    ? '/register?role=professional'
    : user?.role === 'CLIENT'
      ? '/dashboard/verification'
      : '/verification';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchAppointments = fetch('/api/appointments/my', {
      credentials: 'include',
    }).then(res => res.json()).catch(() => []);

    const fetchOrders = fetch('/api/orders/my', {
      credentials: 'include',
    }).then(res => res.json()).catch(() => []);

    Promise.all([fetchAppointments, fetchOrders])
    .then(([apptsData, ordersData]) => {
      if (Array.isArray(apptsData)) {
        const normalizedAppointments = [...apptsData]
          .sort((a, b) => {
            const aTime = a?.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
            const bTime = b?.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
            return bTime - aTime;
          })
          .map(app => ({
            ...app,
            dateLabel: app.scheduledAt ? new Date(app.scheduledAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Fecha pendiente',
            timeLabel: app.scheduledAt ? new Date(app.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'hora por confirmar',
          }));
        setAppointments(normalizedAppointments);
      }
      const ordersArray = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.data) ? ordersData.data : []);
      if (ordersArray.length >= 0) {
        setOrders(ordersArray);
      }
      setProfileForm({
        name: user?.name || '',
        phone: user?.phone || '',
      });
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [isAuthenticated, navigate, user?.name, user?.phone]);

  const handleDispute = async (orderId) => {
    const reason = window.prompt('Por favor, indica el motivo de la disputa:');
    if (!reason) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast(data.message, 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'EN_DISPUTA' } : o));
      } else {
        showToast(data.error || 'Error al abrir disputa', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al abrir disputa', 'error');
    }
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

  const handleJoinVideo = async (appointment) => {
    setJoiningVideoMap((prev) => ({ ...prev, [appointment.id]: true }));
    try {
      const sessionRes = await fetch(`/api/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAuto: false }),
      });
      const sessionData = await sessionRes.json().catch(() => ({}));
      if (!sessionRes.ok) throw new Error(sessionData.error || 'No se pudo preparar la videollamada');

      const tokenRes = await fetch(`/api/appointments/${appointment.id}/video-token`, {
        credentials: 'include',
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) throw new Error(tokenData.error || 'No se pudo generar acceso seguro');

      await fetch(`/api/appointments/${appointment.id}/video-opened`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenData.token }),
      }).catch(() => null);

      const provider = tokenData.provider || sessionData?.videoSession?.provider;
      const joinUrl = tokenData.joinUrl || sessionData?.videoSession?.joinUrl || appointment.meetingLink;
      const embedAllowed = Boolean(tokenData.embedAllowed || sessionData?.videoSession?.embedAllowed);

      if (!joinUrl) throw new Error('Esta cita aun no tiene link de videollamada');

      setAppointments((prev) => prev.map((a) => (a.id === appointment.id ? { ...a, meetingLink: joinUrl } : a)));

      if (provider === 'jitsi' && embedAllowed) {
        setActiveVideoSession({
          appointmentId: appointment.id,
          joinUrl,
          token: tokenData.token,
        });
        return;
      }

      window.open(joinUrl, '_blank', 'noopener,noreferrer');
      showToast('Abriendo videollamada externa', 'success');
    } catch (err) {
      showToast(err.message || 'No se pudo abrir la videollamada', 'error');
    } finally {
      setJoiningVideoMap((prev) => ({ ...prev, [appointment.id]: false }));
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta orden?')) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Orden cancelada exitosamente', 'success');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELADO' } : o));
      } else {
        showToast(data.error || 'Error al cancelar la orden', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'No se pudo actualizar el perfil', 'error');
      } else {
        showToast('Perfil actualizado correctamente', 'success');
      }
    } catch (err) {
      showToast('Error de conexión al actualizar perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
          <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'Manrope', fontWeight: 500 }}>Cargando tus solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="" />
      
      <main className="container client-dashboard-main" style={{ flex: 1, padding: '3rem 1.5rem' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              Hola, {user?.name?.split(' ')[0] || 'Cliente'}
            </h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '1rem' }}>Gestiona tus solicitudes y comunícate con tus profesionales.</p>
          </div>
          <Link to={publishServicePath} className="btn btn-primary" style={{ flexShrink: 0, fontSize: '0.875rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_business</span>
            Publicar mi servicio
          </Link>
        </header>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '2rem', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Resumen', icon: 'dashboard' },
            { id: 'messages', label: 'Mensajes', icon: 'chat' },
            { id: 'profile', label: 'Mi perfil', icon: 'person' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
                fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem',
                color: activeTab === tab.id ? 'var(--secondary)' : 'var(--on-surface-variant)',
                borderBottom: activeTab === tab.id ? '2px solid var(--secondary)' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'messages' && (
          <div className="card animate-in fade-in client-dashboard-chat-card" style={{ padding: '0', overflow: 'hidden', height: 'min(70vh, 680px)', minHeight: '360px' }}>
            <ChatWindow />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="animate-in slide-in-bottom">
            <div className="dashboard-kpi-grid" style={{ marginBottom: '1rem' }}>
              <div className="card glass-card dashboard-surface-1" style={{ padding: '0.875rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Citas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{appointments.length}</p>
              </div>
              <div className="card glass-card dashboard-surface-2" style={{ padding: '0.875rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Órdenes</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{orders.length}</p>
              </div>
              <div className="card glass-card dashboard-surface-1" style={{ padding: '0.875rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Pendientes</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{appointments.filter((a) => a.status === 'PENDING_PAYMENT' || a.status === 'SCHEDULED' || a.status === 'IN_PROGRESS').length}</p>
              </div>
              <div className="card glass-card dashboard-surface-2" style={{ padding: '0.875rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Completadas</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{orders.filter((o) => o.status === 'COMPLETADO').length}</p>
              </div>
            </div>
            <div className="card client-dashboard-card" style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Historial de citas</h2>
          
          {appointments.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>event_busy</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No tienes citas agendadas</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Encuentra al profesional ideal en nuestro directorio.</p>
              <Link to="/directory" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', display: 'inline-block' }}>Ir al Directorio</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {appointments.map(app => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>person</span>
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)' }}>{app.professional?.user?.name || 'Profesional'}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                        {app.service && <span style={{display: 'block', marginBottom: '0.25rem', fontWeight: 600}}>{app.service}</span>}
                        {app.dateLabel} a las {app.timeLabel}
                      </p>
                      {['SCHEDULED', 'IN_PROGRESS'].includes(app.status) && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleJoinVideo(app)}
                          disabled={Boolean(joiningVideoMap[app.id])}
                          style={{ marginTop: '0.375rem', fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                        >
                          {joiningVideoMap[app.id] ? 'Conectando...' : 'Entrar a videollamada'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${['SCHEDULED', 'IN_PROGRESS'].includes(app.status) ? 'badge-blue' : ''}`}>{app.status}</span>
                    {app.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleCancelAppointment(app.id)}
                        disabled={app._cancelling}
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.75rem', padding: '0.5rem 0.75rem', opacity: app._cancelling ? 0.5 : 1 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {app._cancelling ? 'progress_activity' : 'cancel'}
                        </span>
                        {app._cancelling ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card client-dashboard-card">
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Tus Órdenes y Pagos</h2>
          
          {orders.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>receipt_long</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>No tienes órdenes activas</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => {
                const isCompleted = order.status === 'COMPLETADO';
                const canDispute = isCompleted && order.completedAt && (Date.now() - new Date(order.completedAt).getTime()) < 72 * 60 * 60 * 1000;
                
                return (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{order.description}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                        Profesional: {order.professional?.user?.name} | Total: ${order.agreedPrice} {order.currency}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className={`badge`} style={{ 
                        background: order.status === 'COMPLETADO' ? 'var(--success-container)' : 'var(--surface-container-highest)', 
                        color: order.status === 'COMPLETADO' ? 'var(--on-success-container)' : 'var(--on-surface)' 
                      }}>
                        {order.status}
                      </span>
                      {canDispute && (
                        <button 
                          onClick={() => handleDispute(order.id)}
                          className="btn btn-outline"
                          style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>report_problem</span>
                          Abrir Disputa
                        </button>
                      )}
                      {(order.status === 'DRAFT' || order.status === 'PAGO_PENDIENTE') && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          className="btn btn-outline"
                          style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                          Cancelar Orden
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
        )}

        {activeTab === 'profile' && (
          <div className="card client-dashboard-card">
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1rem' }}>Editar Perfil</h2>
            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '0.75rem', maxWidth: '520px' }}>
              <input
                className="input-field"
                placeholder="Nombre completo"
                value={profileForm.name}
                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
              <input
                className="input-field"
                placeholder="Teléfono"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ width: 'fit-content' }}>
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        )}
      </main>

      {activeVideoSession && (
        <VideoCallModal
          session={activeVideoSession}
          onClose={() => setActiveVideoSession(null)}
        />
      )}

      <Footer />
    </div>
  );
}
