import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';

export function AdminPanel() {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeProfessionals, setActiveProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportLink, setSupportLink] = useState(localStorage.getItem('platform_support_link') || 'https://wa.me/');
  const [linkDrafts, setLinkDrafts] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadAll = async () => {
    try {
      setLoading(true);
      const [docsRes, disputesRes, apptRes, prosRes] = await Promise.all([
        fetch('/api/admin/verifications/pending', { credentials: 'include' }),
        fetch('/api/orders/admin/disputes', { credentials: 'include' }),
        fetch('/api/admin/appointments/upcoming', { credentials: 'include' }),
        fetch('/api/admin/professionals/active', { credentials: 'include' }),
      ]);

      if (docsRes.status === 401 || docsRes.status === 403) {
        navigate('/');
        return;
      }

      const docsData = await docsRes.json();
      const disputesData = disputesRes.ok ? await disputesRes.json() : [];
      const apptData = apptRes.ok ? await apptRes.json() : [];
      const prosData = prosRes.ok ? await prosRes.json() : [];

      setPendingDocs(Array.isArray(docsData) ? docsData : []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
      setAppointments(Array.isArray(apptData) ? apptData : []);
      setActiveProfessionals(Array.isArray(prosData) ? prosData : []);

      const draftSeed = {};
      (Array.isArray(apptData) ? apptData : []).forEach((a) => {
        draftSeed[a.id] = a.meetingLink || '';
      });
      setLinkDrafts(draftSeed);
    } catch {
      showToast('No se pudieron cargar los datos de administración', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveSupportLink = () => {
    localStorage.setItem('platform_support_link', supportLink.trim());
    showToast('Link guardado correctamente', 'success');
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [appointments]);

  const handleSendMeetingLink = async (appointmentId) => {
    const link = (linkDrafts[appointmentId] || '').trim();
    if (!/^https?:\/\//i.test(link)) {
      showToast('Ingresa un link válido (http/https)', 'error');
      return;
    }

    setSavingMap((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}/meeting-link`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink: link }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el link');

      showToast('Link de cita enviado a cliente y profesional', 'success');
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, meetingLink: link } : a)));
    } catch (err) {
      showToast(err.message || 'Error al enviar link', 'error');
    } finally {
      setSavingMap((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const copyReservationLink = async (professionalId) => {
    const link = `${window.location.origin}/reserva/${professionalId}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link de reserva copiado', 'success');
    } catch {
      showToast('No se pudo copiar el link', 'error');
    }
  };

  return (
    <>
      <NavbarIntecnia />
      <div className="container" style={{ padding: '3rem 1rem', minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '2rem', fontWeight: 700 }}>Super Admin Dashboard</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Gestión operativa de citas y envío manual de links de videollamada.</p>

        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Link principal de contacto/soporte</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={supportLink} onChange={(e) => setSupportLink(e.target.value)} className="input-field" placeholder="https://wa.me/521..." style={{ flex: 1, minWidth: '260px' }} />
            <button className="btn btn-primary" onClick={saveSupportLink}>Guardar link</button>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Resumen rápido</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
              <p style={{ color: 'var(--on-surface-variant)' }}>Verificaciones pendientes: <strong>{pendingDocs.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Disputas activas: <strong>{disputes.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Citas próximas: <strong>{appointments.length}</strong></p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Links directos de reserva</h2>
          {loading ? (
            <p>Cargando profesionales...</p>
          ) : activeProfessionals.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay profesionales activos para mostrar.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem', marginBottom: '1rem' }}>
              {activeProfessionals.map((pro) => (
                <div key={pro.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>{pro.name}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>{pro.title || 'Profesional verificado'}</p>
                  </div>
                  <button className="btn btn-outline" onClick={() => copyReservationLink(pro.id)}>Copiar link</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Asignar link de videollamada por cita</h2>
          {loading ? (
            <p>Cargando citas...</p>
          ) : sortedAppointments.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay citas próximas para gestionar.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {sortedAppointments.map((appt) => (
                <div key={appt.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.875rem' }}>
                  <div style={{ marginBottom: '0.625rem' }}>
                    <p style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9375rem' }}>
                      {new Date(appt.scheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>
                      Cliente: <strong>{appt.client?.name || 'Invitado'}</strong> · Profesional: <strong>{appt.professional?.user?.name || 'N/D'}</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      className="input-field"
                      placeholder="https://meet.google.com/..."
                      value={linkDrafts[appt.id] || ''}
                      onChange={(e) => setLinkDrafts((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                      style={{ flex: 1, minWidth: '260px' }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSendMeetingLink(appt.id)}
                      disabled={!!savingMap[appt.id]}
                    >
                      {savingMap[appt.id] ? 'Enviando...' : 'Guardar y enviar link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
