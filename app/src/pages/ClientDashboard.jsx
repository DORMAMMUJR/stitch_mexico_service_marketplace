import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { ChatWindow } from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';

export function ClientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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
        setAppointments(apptsData);
      }
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

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

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Cita cancelada con éxito', 'success');
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'CANCELLED' } : a));
      } else {
        showToast(data.error || 'Error al cancelar la cita', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
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
      
      <main className="container" style={{ flex: 1, padding: '3rem 1.5rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Manrope', fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Hola, {user?.name?.split(' ')[0] || 'Cliente'}
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '1rem' }}>Gestiona tus solicitudes y comunícate con tus profesionales.</p>
        </header>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '2rem', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: 'Resumen', icon: 'dashboard' },
            { id: 'messages', label: 'Mensajes', icon: 'chat' }
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
          <div className="card animate-in fade-in" style={{ padding: '0', overflow: 'hidden', height: 'calc(100vh - 350px)', minHeight: '500px' }}>
            <ChatWindow />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="animate-in slide-in-bottom">
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Tus Solicitudes de Servicio</h2>
          
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
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>person</span>
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)' }}>{app.professional?.user?.name || 'Profesional'}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{new Date(app.date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`badge ${app.status === 'SCHEDULED' ? 'badge-blue' : ''}`}>{app.status}</span>
                    {app.status === 'SCHEDULED' && (
                      <button 
                        onClick={() => handleCancelAppointment(app.id)}
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
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
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{order.description}</h4>
                      <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                        Profesional: {order.professional?.user?.name} | Total: ${order.agreedPrice} {order.currency}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
      </main>

      <Footer />
    </div>
  );
}
