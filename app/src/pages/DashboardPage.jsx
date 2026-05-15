import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { ChatWindow } from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { VideoCallModal } from '../components/VideoCallModal';

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

const MEDICAL_SPECIALTY_OPTIONS = [
  { value: 'MEDICINA_GENERAL', label: 'Medicina general' },
  { value: 'PEDIATRIA', label: 'Pediatria' },
  { value: 'GINECOLOGIA', label: 'Ginecologia' },
  { value: 'TRAUMATOLOGIA', label: 'Traumatologia' },
  { value: 'ORTOPEDIA', label: 'Ortopedia' },
  { value: 'DERMATOLOGIA', label: 'Dermatologia' },
  { value: 'PSIQUIATRIA', label: 'Psiquiatria' },
  { value: 'PSICOLOGIA', label: 'Psicologia' },
  { value: 'CARDIOLOGIA', label: 'Cardiologia' },
  { value: 'ODONTOLOGIA', label: 'Odontologia' },
  { value: 'NUTRICION', label: 'Nutricion' },
  { value: 'MEDICINA_INTERNA', label: 'Medicina interna' },
];

const CONSULTATION_MODE_OPTIONS = [
  { value: 'PRESENCIAL', label: 'Consultorio presencial' },
  { value: 'DOMICILIO', label: 'Visita a domicilio' },
  { value: 'TELEMEDICINA', label: 'Telemedicina' },
];

const INSURER_OPTIONS = ['GNP', 'AXA', 'METLIFE', 'MAPFRE', 'ALLIANZ', 'BBVA', 'INBURSA', 'QUALITAS', 'PLAN_PRIVADO'];
const SLOT_INTERVAL_OPTIONS = [20, 30, 45];
const VIDEO_PROVIDER_OPTIONS = [
  { value: 'jitsi', label: 'Jitsi (embebido)' },
  { value: 'zoom', label: 'Zoom (externo)' },
  { value: 'meet', label: 'Google Meet (externo)' },
];

function inferVideoProviderFromUrl(url) {
  if (!url) return 'jitsi';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('zoom.us') || host.includes('zoom.com')) return 'zoom';
    if (host.includes('meet.google')) return 'meet';
  } catch {
    return 'jitsi';
  }
  return 'jitsi';
}

function isVideoConfigurableStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'SCHEDULED' || normalized === 'IN_PROGRESS';
}

export function DashboardPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isProfessional = user?.role === 'PROFESSIONAL';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [joiningVideoMap, setJoiningVideoMap] = useState({});
  const [videoConfigDrafts, setVideoConfigDrafts] = useState({});
  const [videoConfigSavingMap, setVideoConfigSavingMap] = useState({});
  const [activeVideoSession, setActiveVideoSession] = useState(null);
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
    medicalSpecialty: '',
    consultationModes: [],
    acceptedInsurers: [],
    slotIntervalMinutes: 30,
    hourlyRate: '',
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
            medicalSpecialty: proProfileJson?.medicalSpecialty || '',
            consultationModes: Array.isArray(proProfileJson?.consultationModes) ? proProfileJson.consultationModes : [],
            acceptedInsurers: Array.isArray(proProfileJson?.acceptedInsurers) ? proProfileJson.acceptedInsurers : [],
            slotIntervalMinutes: SLOT_INTERVAL_OPTIONS.includes(Number(proProfileJson?.slotIntervalMinutes)) ? Number(proProfileJson.slotIntervalMinutes) : 30,
            hourlyRate: proProfileJson?.hourlyRate || '',
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
            medicalSpecialty: '',
            consultationModes: [],
            acceptedInsurers: [],
            slotIntervalMinutes: 30,
            hourlyRate: '',
          });
        }
      })
      .catch(() => showToast('No se pudieron cargar todos los datos del panel', 'error'))
      .finally(() => setIsLoading(false));
  }, [isProfessional, showToast, user?.email, user?.name, user?.phone]);

  useEffect(() => {
    if (!isProfessional || !Array.isArray(appointments) || appointments.length === 0) return;
    setVideoConfigDrafts((prev) => {
      const next = { ...prev };
      for (const app of appointments) {
        if (!isVideoConfigurableStatus(app?.status)) continue;
        const persistedProvider = String(app?.videoSession?.provider || '').toLowerCase();
        const provider = ['jitsi', 'zoom', 'meet'].includes(persistedProvider)
          ? persistedProvider
          : inferVideoProviderFromUrl(app?.videoSession?.joinUrl || app?.meetingLink || '');
        const meetingLink = app?.videoSession?.joinUrl || app?.meetingLink || '';
        if (!next[app.id]) {
          next[app.id] = { provider, meetingLink };
        }
      }
      return next;
    });
  }, [appointments, isProfessional]);

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

      setAppointments((prev) => prev.map((a) => (
        a.id === appointment.id
          ? {
            ...a,
            meetingLink: joinUrl,
            videoSession: sessionData?.videoSession
              ? { ...sessionData.videoSession, joinUrl }
              : (a.videoSession ? { ...a.videoSession, joinUrl } : null),
          }
          : a
      )));
      if (isProfessional) {
        setVideoConfigDrafts((prev) => ({
          ...prev,
          [appointment.id]: {
            provider: provider || prev[appointment.id]?.provider || 'jitsi',
            meetingLink: joinUrl || '',
          },
        }));
      }

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

  const handleSaveAppointmentVideoConfig = async (appointment) => {
    if (!isProfessional || !isVideoConfigurableStatus(appointment?.status)) return;
    const draft = videoConfigDrafts[appointment.id] || {};
    const provider = ['jitsi', 'zoom', 'meet'].includes(String(draft.provider || '').toLowerCase())
      ? String(draft.provider).toLowerCase()
      : 'jitsi';
    const meetingLink = String(draft.meetingLink || '').trim();

    if ((provider === 'zoom' || provider === 'meet') && !meetingLink) {
      showToast('Debes ingresar un link para Zoom o Google Meet', 'error');
      return;
    }

    setVideoConfigSavingMap((prev) => ({ ...prev, [appointment.id]: true }));
    try {
      const payload = { provider };
      if (meetingLink) payload.meetingLink = meetingLink;
      const res = await fetch(`/api/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la configuracion de videollamada');

      const nextMeetingLink = data?.meetingLink || data?.videoSession?.joinUrl || '';
      const nextVideoSession = data?.videoSession || null;
      setAppointments((prev) => prev.map((a) => (
        a.id === appointment.id
          ? { ...a, meetingLink: nextMeetingLink, videoSession: nextVideoSession }
          : a
      )));
      setVideoConfigDrafts((prev) => ({
        ...prev,
        [appointment.id]: {
          provider: nextVideoSession?.provider || provider,
          meetingLink: nextMeetingLink,
        },
      }));
      showToast('Videollamada configurada para la cita', 'success');
    } catch (err) {
      showToast(err.message || 'No se pudo configurar la videollamada', 'error');
    } finally {
      setVideoConfigSavingMap((prev) => ({ ...prev, [appointment.id]: false }));
    }
  };

  const handleAutoGenerateAppointmentVideo = async (appointment) => {
    if (!isProfessional || !isVideoConfigurableStatus(appointment?.status)) return;
    setVideoConfigSavingMap((prev) => ({ ...prev, [appointment.id]: true }));
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAuto: true, provider: 'jitsi' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo generar la sala automatica');

      const nextMeetingLink = data?.meetingLink || data?.videoSession?.joinUrl || '';
      const nextVideoSession = data?.videoSession || null;
      setAppointments((prev) => prev.map((a) => (
        a.id === appointment.id
          ? { ...a, meetingLink: nextMeetingLink, videoSession: nextVideoSession }
          : a
      )));
      setVideoConfigDrafts((prev) => ({
        ...prev,
        [appointment.id]: {
          provider: 'jitsi',
          meetingLink: nextMeetingLink,
        },
      }));
      showToast('Sala Jitsi automatica generada', 'success');
    } catch (err) {
      showToast(err.message || 'No se pudo generar la sala automatica', 'error');
    } finally {
      setVideoConfigSavingMap((prev) => ({ ...prev, [appointment.id]: false }));
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
          medicalSpecialty: profileForm.medicalSpecialty || null,
          consultationModes: Array.isArray(profileForm.consultationModes) ? profileForm.consultationModes : [],
          acceptedInsurers: Array.isArray(profileForm.acceptedInsurers) ? profileForm.acceptedInsurers : [],
          slotIntervalMinutes: Number(profileForm.slotIntervalMinutes) || 30,
          hourlyRate: profileForm.hourlyRate,
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
                  const normalizedStatus = String(app.status || '').toUpperCase();
                  const canUseVideo = isVideoConfigurableStatus(normalizedStatus);
                  const draft = videoConfigDrafts[app.id] || {
                    provider: String(app.videoSession?.provider || '').toLowerCase() || inferVideoProviderFromUrl(app.videoSession?.joinUrl || app.meetingLink || ''),
                    meetingLink: app.videoSession?.joinUrl || app.meetingLink || '',
                  };
                  const selectedProvider = ['jitsi', 'zoom', 'meet'].includes(String(draft.provider || '').toLowerCase()) ? String(draft.provider).toLowerCase() : 'jitsi';
                  const isSavingVideoConfig = Boolean(videoConfigSavingMap[app.id]);

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
                        {isProfessional && canUseVideo && (
                          <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '0.625rem', background: 'rgba(255,255,255,0.02)' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Configuracion de videollamada</p>
                            <select
                              className="input-field"
                              value={selectedProvider}
                              onChange={(e) => setVideoConfigDrafts((prev) => ({
                                ...prev,
                                [app.id]: {
                                  provider: e.target.value,
                                  meetingLink: prev[app.id]?.meetingLink || '',
                                },
                              }))}
                              disabled={isSavingVideoConfig}
                              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.55rem' }}
                            >
                              {VIDEO_PROVIDER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <input
                              className="input-field"
                              value={draft.meetingLink || ''}
                              onChange={(e) => setVideoConfigDrafts((prev) => ({
                                ...prev,
                                [app.id]: {
                                  provider: selectedProvider,
                                  meetingLink: e.target.value,
                                },
                              }))}
                              disabled={isSavingVideoConfig}
                              placeholder={selectedProvider === 'jitsi' ? 'Opcional para Jitsi manual' : 'https://...'}
                              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.55rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleSaveAppointmentVideoConfig(app)}
                                disabled={isSavingVideoConfig}
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                              >
                                {isSavingVideoConfig ? 'Guardando...' : 'Guardar proveedor/link'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleAutoGenerateAppointmentVideo(app)}
                                disabled={isSavingVideoConfig}
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                              >
                                {isSavingVideoConfig ? 'Generando...' : 'Generar sala Jitsi automatica'}
                              </button>
                            </div>
                          </div>
                        )}
                        {canUseVideo && (
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
                  <select className="input-field" value={profileForm.medicalSpecialty} onChange={(e) => setProfileForm((p) => ({ ...p, medicalSpecialty: e.target.value }))}>
                    <option value="">Especialidad medica</option>
                    {MEDICAL_SPECIALTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <div style={{ display: 'grid', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Modalidades de consulta</p>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                      {CONSULTATION_MODE_OPTIONS.map((mode) => (
                        <label key={mode.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                          <input
                            type="checkbox"
                            checked={profileForm.consultationModes.includes(mode.value)}
                            onChange={() =>
                              setProfileForm((p) => ({
                                ...p,
                                consultationModes: p.consultationModes.includes(mode.value)
                                  ? p.consultationModes.filter((value) => value !== mode.value)
                                  : [...p.consultationModes, mode.value],
                              }))
                            }
                            style={{ accentColor: 'var(--secondary)' }}
                          />
                          {mode.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Aseguradoras aceptadas</p>
                    <div style={{ display: 'grid', gap: '0.4rem', maxHeight: '11.5rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {INSURER_OPTIONS.map((insurer) => (
                        <label key={insurer} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface)' }}>
                          <input
                            type="checkbox"
                            checked={profileForm.acceptedInsurers.includes(insurer)}
                            onChange={() =>
                              setProfileForm((p) => ({
                                ...p,
                                acceptedInsurers: p.acceptedInsurers.includes(insurer)
                                  ? p.acceptedInsurers.filter((value) => value !== insurer)
                                  : [...p.acceptedInsurers, insurer],
                              }))
                            }
                            style={{ accentColor: 'var(--secondary)' }}
                          />
                          {insurer}
                        </label>
                      ))}
                    </div>
                  </div>
                  <select
                    className="input-field"
                    value={profileForm.slotIntervalMinutes}
                    onChange={(e) => setProfileForm((p) => ({ ...p, slotIntervalMinutes: Number(e.target.value) || 30 }))}
                  >
                    {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes} minutos por cita</option>
                    ))}
                  </select>
                  <input className="input-field" placeholder="Costos/Tarifas" value={profileForm.hourlyRate} onChange={(e) => setProfileForm((p) => ({ ...p, hourlyRate: e.target.value }))} />
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

      {activeVideoSession && (
        <VideoCallModal
          session={activeVideoSession}
          onClose={() => setActiveVideoSession(null)}
        />
      )}
    </div>
  );
}

