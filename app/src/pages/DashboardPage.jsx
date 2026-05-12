import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { ChatWindow } from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';

function normalizeAppointments(list) {
  if (!Array.isArray(list)) return [];

  return [...list]
    .sort((a, b) => {
      const aTime = a?.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bTime = b?.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return bTime - aTime;
    })
    .map((app) => ({
      ...app,
      dateLabel: app.scheduledAt
        ? new Date(app.scheduledAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Fecha pendiente',
      timeLabel: app.scheduledAt
        ? new Date(app.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        : 'Hora por confirmar',
    }));
}

export function DashboardPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isProfessional = user?.role === 'PROFESSIONAL';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [selectedClientAppointment, setSelectedClientAppointment] = useState(null);
  const [hasActivePayments, setHasActivePayments] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    profileViews: 0,
    appointmentsScheduled: 0,
    completedAppointments: 0,
    totalRevenue: 0,
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    lastName: '',
    phone: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    title: '',
    bio: '',
    category: 'HEALTH_WELLNESS',
    hourlyRate: '',
    meetLink: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarInputRef = useRef(null);

  const [availabilities, setAvailabilities] = useState([]);

  const tabs = useMemo(() => {
    const base = [
      { id: 'overview', label: 'Tablero', icon: 'dashboard' },
      { id: 'appointments', label: 'Citas', icon: 'event' },
      { id: 'messages', label: 'Mensajes', icon: 'forum' },
      { id: 'profile', label: 'Perfil', icon: 'person' },
    ];

    if (isProfessional) {
      base.push({ id: 'availability', label: 'Horario', icon: 'schedule' });
    }

    return base;
  }, [isProfessional]);

  useEffect(() => {
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const defaultAvailabilities = DAYS.map((day, i) => ({
      dayOfWeek: i,
      dayName: day,
      active: i > 0 && i < 6,
      startTime: '09:00',
      endTime: '18:00',
    }));

    const fetchAppointments = fetch('/api/appointments/my', { credentials: 'include' }).then((res) => res.json()).catch(() => []);
    const fetchUserProfile = fetch('/api/auth/me', { credentials: 'include' }).then((res) => res.json()).catch(() => ({}));

    const requests = [fetchAppointments, fetchUserProfile];

    if (isProfessional) {
      requests.push(
        fetch('/api/professionals/me', { credentials: 'include' }).then((res) => res.json()).catch(() => ({})),
        fetch('/api/professionals/me/availability', { credentials: 'include' }).then((res) => res.json()).catch(() => [])
      );
    }

    Promise.all(requests)
      .then((result) => {
        const [appointmentsJson, authMeJson, proProfileJson, proAvailabilityJson] = result;
        const normalizedAppointments = normalizeAppointments(appointmentsJson);

        setAppointments(normalizedAppointments);

        const fullName = authMeJson?.name || user?.name || '';
        const [firstName = '', ...lastParts] = String(fullName).split(' ');
        const lastName = lastParts.join(' ');

        if (isProfessional) {
          setDashboardData({
            appointmentsScheduled: normalizedAppointments.length,
            completedAppointments: normalizedAppointments.filter((a) => String(a.status || '').toUpperCase() === 'COMPLETED').length,
            profileViews: 0,
            totalRevenue: 0,
          });
          setHasActivePayments(Boolean(proProfileJson?.stripeAccountId));

          setProfileForm({
            name: firstName,
            lastName,
            phone: authMeJson?.phone || user?.phone || '',
            email: authMeJson?.email || user?.email || '',
            currentPassword: '',
            newPassword: '',
            title: proProfileJson?.title || '',
            bio: proProfileJson?.bio || '',
            category: proProfileJson?.category || 'HEALTH_WELLNESS',
            hourlyRate: proProfileJson?.hourlyRate || '',
            meetLink: proProfileJson?.meetLink || '',
          });

          if (Array.isArray(proAvailabilityJson) && proAvailabilityJson.length > 0) {
            const merged = defaultAvailabilities.map((def) => {
              const found = proAvailabilityJson.find((a) => a.dayOfWeek === def.dayOfWeek);
              return found ? { ...def, active: true, startTime: found.startTime, endTime: found.endTime } : { ...def, active: false };
            });
            setAvailabilities(merged);
          } else {
            setAvailabilities(defaultAvailabilities);
          }
        } else {
          setDashboardData({
            appointmentsScheduled: normalizedAppointments.length,
            completedAppointments: normalizedAppointments.filter((a) => String(a.status || '').toUpperCase() === 'COMPLETED').length,
            profileViews: 0,
            totalRevenue: 0,
          });
          setHasActivePayments(false);

          setProfileForm({
            name: firstName,
            lastName,
            phone: authMeJson?.phone || user?.phone || '',
            email: authMeJson?.email || user?.email || '',
            currentPassword: '',
            newPassword: '',
            title: '',
            bio: '',
            category: 'HEALTH_WELLNESS',
            hourlyRate: '',
            meetLink: '',
          });
        }
      })
      .catch(() => showToast('No se pudieron cargar todos los datos del panel', 'error'))
      .finally(() => setIsLoading(false));
  }, [isProfessional, showToast, user?.email, user?.name, user?.phone]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch('/api/users/avatar', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo subir la foto');
      setAvatarPreview(data.avatarUrl || null);
      updateUser?.({ avatarUrl: data.avatarUrl });
      showToast('Foto actualizada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al actualizar foto', 'error');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, _cancelling: true } : a)));
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: 'PATCH', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cancelar la cita');
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: 'CANCELLED', _cancelling: false } : a)));
      showToast('Cita cancelada', 'success');
    } catch (err) {
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, _cancelling: false } : a)));
      showToast(err.message || 'Error al cancelar', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const userPayload = {
        name: profileForm.name,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        email: profileForm.email,
        currentPassword: profileForm.currentPassword,
        newPassword: profileForm.newPassword,
      };

      const userRes = await fetch('/api/users/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload),
      });

      const userData = await userRes.json().catch(() => ({}));
      if (!userRes.ok) throw new Error(userData?.error || 'No se pudo actualizar la cuenta');

      updateUser?.({ name: `${profileForm.name} ${profileForm.lastName}`.trim(), phone: profileForm.phone, email: profileForm.email });

      if (isProfessional) {
        const proPayload = {
          title: profileForm.title,
          bio: profileForm.bio,
          category: profileForm.category,
          hourlyRate: profileForm.hourlyRate,
          meetLink: profileForm.meetLink,
        };

        const proRes = await fetch('/api/professionals/me', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proPayload),
        });

        const proData = await proRes.json().catch(() => ({}));
        if (!proRes.ok) throw new Error(proData?.error || 'No se pudo actualizar perfil profesional');
      }

      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      showToast('Perfil actualizado', 'success');
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAvailability = async () => {
    const payload = availabilities.filter((a) => a.active).map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));
    try {
      const res = await fetch('/api/professionals/me/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilities: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar disponibilidad');
      showToast('Disponibilidad actualizada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al actualizar disponibilidad', 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="dashboard" />

      <main className="container dashboard-premium" style={{ padding: '2rem 1rem 3rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <p className="text-label-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>PANEL UNIFICADO</p>
          <h1 className="text-headline-md" style={{ color: 'var(--primary)' }}>{isProfessional ? 'Dashboard cliente + profesional' : 'Dashboard cliente'}</h1>
        </header>

        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '1.25rem', overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.75rem 0.9rem',
                fontFamily: 'Manrope',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: activeTab === tab.id ? 'var(--secondary)' : 'var(--on-surface-variant)',
                borderBottom: activeTab === tab.id ? '2px solid var(--secondary)' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <section style={{ display: 'grid', gap: '0.875rem' }}>
            <div className="dashboard-kpi-grid">
              <div className="card glass-card dashboard-surface-1" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Citas agendadas</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{dashboardData.appointmentsScheduled}</p>
              </div>

              <div className="card glass-card dashboard-surface-2" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Citas completadas</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{dashboardData.completedAppointments}</p>
              </div>

              <div className="card glass-card dashboard-surface-2" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Ingresos</p>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>Proximamente</p>
              </div>

              {isProfessional && (
                <div className="card glass-card dashboard-surface-1" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>Vistas de perfil</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{dashboardData.profileViews}</p>
                </div>
              )}
            </div>

            {isProfessional && (
              <div className="card glass-card" style={{ padding: '0.875rem 1rem', border: '1px solid var(--outline-variant)' }}>
                {hasActivePayments ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderRadius: '9999px', padding: '0.35rem 0.7rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                    Estado de pagos: Activo <span>{'\u2713'}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/settings')}
                  >
                    Configurar pagos para recibir depositos {'\u2192'}
                  </button>
                )}
              </div>
            )}

            <div className="card glass-card" style={{ padding: '1rem' }}>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>Actividad reciente</h3>
              {appointments.slice(0, 4).length === 0 ? (
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Sin actividad reciente.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {appointments.slice(0, 4).map((app) => (
                    <div key={app.id} style={{ padding: '0.625rem 0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                      <p style={{ color: 'var(--on-surface)', fontWeight: 600, fontSize: '0.875rem' }}>{app.dateLabel} · {app.timeLabel}</p>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>{app.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'appointments' && (
          <section className="card glass-card" style={{ padding: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Mis citas</h2>
            {appointments.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)' }}>No hay citas registradas.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {appointments.map((app) => {
                  const counterpart = isProfessional ? app.client : app.professional?.user;
                  const counterpartName = counterpart?.name || (isProfessional ? 'Cliente' : 'Profesional');
                  const counterpartAvatar = counterpart?.avatarUrl || null;

                  return (
                    <div key={app.id} className="dashboard-appointment-item" style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div>
                        {isProfessional ? (
                          <button
                            type="button"
                            onClick={() => setSelectedClientAppointment({ name: counterpartName, avatarUrl: counterpartAvatar, scheduledAt: app.scheduledAt })}
                            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {counterpartName}
                          </button>
                        ) : (
                          <p style={{ fontWeight: 700, color: 'var(--primary)' }}>{counterpartName}</p>
                        )}

                        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{app.dateLabel} - {app.timeLabel}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{app.status}</p>
                        {app.meetingLink && (
                          <a
                            href={app.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 700 }}
                          >
                            Abrir videollamada
                          </a>
                        )}
                      </div>
                      {app.status === 'SCHEDULED' && (
                        <button onClick={() => handleCancelAppointment(app.id)} disabled={app._cancelling} className="btn btn-outline" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                          {app._cancelling ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'messages' && (
          <section className="card glass-card" style={{ padding: 0, overflow: 'hidden', minHeight: '420px' }}>
            <ChatWindow />
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="card glass-card" style={{ padding: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Ajustes de perfil</h2>

            <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '0.75rem', maxWidth: '700px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.25rem' }}>
                <img
                  src={avatarPreview || user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=047857&color=fff&size=96`}
                  alt="Avatar"
                  style={{ width: '4rem', height: '4rem', borderRadius: '9999px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.35)' }}
                />
                <div>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                  <button type="button" className="btn btn-outline" onClick={() => avatarInputRef.current?.click()}>
                    Subir/Cambiar foto
                  </button>
                </div>
              </div>

              <input className="input-field" placeholder="Nombre" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} required />
              <input className="input-field" placeholder="Apellidos" value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} required />
              <input className="input-field" placeholder="Telefono" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} required />
              <input className="input-field" type="email" placeholder="Correo" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} required />
              <input className="input-field" type="password" placeholder="Contrasena actual (si vas a cambiarla)" value={profileForm.currentPassword} onChange={(e) => setProfileForm((p) => ({ ...p, currentPassword: e.target.value }))} />
              <input className="input-field" type="password" placeholder="Nueva contrasena" value={profileForm.newPassword} onChange={(e) => setProfileForm((p) => ({ ...p, newPassword: e.target.value }))} />

              {isProfessional && (
                <>
                  <input className="input-field" placeholder="Titulo profesional" value={profileForm.title} onChange={(e) => setProfileForm((p) => ({ ...p, title: e.target.value }))} />
                  <textarea className="input-field" placeholder="Descripcion" rows={4} value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} />
                  <input className="input-field" placeholder="Costos/Tarifas" value={profileForm.hourlyRate} onChange={(e) => setProfileForm((p) => ({ ...p, hourlyRate: e.target.value }))} />
                  <input className="input-field" placeholder="Link de Meet" value={profileForm.meetLink} onChange={(e) => setProfileForm((p) => ({ ...p, meetLink: e.target.value }))} />
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={savingProfile} style={{ width: 'fit-content' }}>
                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </section>
        )}

        {isProfessional && activeTab === 'availability' && (
          <section className="card glass-card" style={{ padding: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>Disponibilidad semanal</h2>
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {availabilities.map((slot, idx) => (
                <div key={slot.dayOfWeek} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem', alignItems: 'center', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.625rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: 'var(--primary)' }}>
                    <input type="checkbox" checked={slot.active} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => (i === idx ? { ...it, active: e.target.checked } : it)))} />
                    {slot.dayName}
                  </label>
                  <input type="time" className="input-field" style={{ minWidth: '108px', padding: '0.4rem 0.55rem' }} disabled={!slot.active} value={slot.startTime} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => (i === idx ? { ...it, startTime: e.target.value } : it)))} />
                  <input type="time" className="input-field" style={{ minWidth: '108px', padding: '0.4rem 0.55rem' }} disabled={!slot.active} value={slot.endTime} onChange={(e) => setAvailabilities((prev) => prev.map((it, i) => (i === idx ? { ...it, endTime: e.target.value } : it)))} />
                  <span style={{ fontSize: '0.75rem', color: slot.active ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 700 }}>{slot.active ? 'Activo' : 'Inactivo'}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginTop: '0.875rem' }} onClick={handleSaveAvailability}>Guardar disponibilidad</button>
          </section>
        )}
      </main>

      {isProfessional && selectedClientAppointment && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setSelectedClientAppointment(null)}
            style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,0,0,0.45)', cursor: 'pointer' }}
            aria-label="Cerrar"
          />
          <aside className="card glass-card" style={{ position: 'relative', width: 'min(420px, 100vw)', height: '100%', borderRadius: 0, borderLeft: '1px solid var(--outline-variant)', padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Detalle del cliente</h3>
              <button type="button" className="btn btn-outline" onClick={() => setSelectedClientAppointment(null)}>Cerrar</button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.875rem', borderRadius: 'var(--radius-lg)', background: 'var(--surface-container-low)' }}>
              {selectedClientAppointment.avatarUrl ? (
                <img
                  src={selectedClientAppointment.avatarUrl}
                  alt={selectedClientAppointment.name}
                  style={{ width: '3rem', height: '3rem', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {selectedClientAppointment.name?.charAt(0)?.toUpperCase() || 'C'}
                </div>
              )}

              <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>{selectedClientAppointment.name}</p>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>
                  {selectedClientAppointment.scheduledAt
                    ? new Date(selectedClientAppointment.scheduledAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Sin fecha confirmada'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

