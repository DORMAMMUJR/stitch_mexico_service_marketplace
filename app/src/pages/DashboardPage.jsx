import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { ChatWindow } from '../components/ChatWindow';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { VideoCallModal } from '../components/VideoCallModal';
import { apiFetch } from '../lib/api';
import { getPaymentSummary, hasAction, normalizeAppointmentsForDashboard } from '../lib/flowState';

function normalizeAppointments(list) {
  return normalizeAppointmentsForDashboard(list);
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
  return normalized === 'CONFIRMED' || normalized === 'SCHEDULED' || normalized === 'IN_PROGRESS';
}

function parseAppointmentMeta(notes) {
  if (!notes || typeof notes !== 'string') return null;
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getAppointmentPaymentSummary(appointment) {
  return getPaymentSummary(appointment);
}

function canConfirmTransferPayment(appointment) {
  return hasAction(appointment, 'CONFIRM_TRANSFER_PAYMENT');
}

function canConfirmAppointment(appointment) {
  return hasAction(appointment, 'CONFIRM_APPOINTMENT');
}

function getAppointmentAmount(appointment) {
  const meta = parseAppointmentMeta(appointment?.notes);
  const payment = meta?.payment || {};
  return Number(payment.total || payment.basePrice || appointment?.total || 0) || 0;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
}

function getVerificationLabel(profile) {
  if (profile?.isVerified) return 'Verificado';
  const status = String(profile?.verificationStatus || '').toUpperCase();
  if (status === 'IN_REVIEW') return 'En revision';
  if (status === 'REJECTED') return 'Requiere correccion';
  return 'Pendiente';
}

function isUpcomingAppointment(appointment) {
  const status = String(appointment?.status || '').toUpperCase();
  const scheduledTime = appointment?.scheduledAt ? new Date(appointment.scheduledAt).getTime() : 0;
  return ['REQUESTED', 'PENDING_PAYMENT', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status)
    && (!scheduledTime || scheduledTime >= Date.now());
}

const DASHBOARD_DEFAULT_TAB = 'overview';

function DashboardTabNav({ tabs, activeTab, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.625rem', borderBottom: '1px solid var(--outline-variant)', marginBottom: '1.5rem', overflowX: 'auto' }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.8rem 1rem',
            fontFamily: 'Manrope',
            fontWeight: 700,
            fontSize: '0.9375rem',
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
  );
}

export function DashboardPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isProfessional = user?.role === 'PROFESSIONAL';
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(DASHBOARD_DEFAULT_TAB);
  const [appointments, setAppointments] = useState([]);
  const [joiningVideoMap, setJoiningVideoMap] = useState({});
  const [videoConfigDrafts, setVideoConfigDrafts] = useState({});
  const [videoConfigSavingMap, setVideoConfigSavingMap] = useState({});
  const [appointmentActionMap, setAppointmentActionMap] = useState({});
  const [appointmentTimelineMap, setAppointmentTimelineMap] = useState({});
  const [appointmentTimelineLoadingMap, setAppointmentTimelineLoadingMap] = useState({});
  const [chatBootstrap, setChatBootstrap] = useState(null);
  const [activeVideoSession, setActiveVideoSession] = useState(null);
  const [selectedClientAppointment, setSelectedClientAppointment] = useState(null);
  const [hasActivePayments, setHasActivePayments] = useState(false);
  const [professionalProfile, setProfessionalProfile] = useState(null);

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
    category: 'PSYCHOLOGY',
    medicalSpecialty: '',
    treatedConditions: '',
    consultationModes: [],
    officeAddress: '',
    experienceYears: '',
    certifications: '',
    associations: '',
    emergencyDisclaimerAccepted: false,
    serviceAreas: '',
    languages: '',
    acceptedInsurers: [],
    slotIntervalMinutes: 30,
    presencialRate: '',
    telemedicineRate: '',
    homeVisitRate: '',
    hourlyRate: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [officePhotos, setOfficePhotos] = useState([]);
  const [savingOfficePhoto, setSavingOfficePhoto] = useState(false);
  const avatarInputRef = useRef(null);
  const officePhotoInputRef = useRef(null);

  const [availabilities, setAvailabilities] = useState([]);

  const tabs = useMemo(() => {
    const base = [
      { id: 'overview', label: 'Tablero', icon: 'dashboard' },
      { id: 'appointments', label: 'Citas', icon: 'event' },
      { id: 'messages', label: 'Mensajes', icon: 'forum' },
      { id: 'profile', label: isProfessional ? 'Perfil/verificacion' : 'Perfil', icon: 'person' },
    ];

    if (isProfessional) {
      base.push({ id: 'availability', label: 'Disponibilidad', icon: 'schedule' });
    }

    return base;
  }, [isProfessional]);

  const validTabIds = useMemo(() => new Set(tabs.map((tab) => tab.id)), [tabs]);

  useEffect(() => {
    const tabFromQuery = String(searchParams.get('tab') || '').toLowerCase();
    const nextTab = validTabIds.has(tabFromQuery) ? tabFromQuery : DASHBOARD_DEFAULT_TAB;
    if (activeTab !== nextTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams, validTabIds]);

  const handleTabChange = (tabId) => {
    if (!validTabIds.has(tabId)) return;
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    if (tabId === DASHBOARD_DEFAULT_TAB) {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tabId);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const defaultAvailabilities = DAYS.map((day, i) => ({
      dayOfWeek: i,
      dayName: day,
      active: i > 0 && i < 6,
      startTime: '09:00',
      endTime: '18:00',
    }));

    const safeRequest = (endpoint, fallbackValue) => apiFetch(endpoint).catch(() => fallbackValue);
    const fetchAppointments = safeRequest('/appointments/my', []);
    const fetchUserProfile = safeRequest('/auth/me', {});

    const requests = [fetchAppointments, fetchUserProfile];

    if (isProfessional) {
      requests.push(
        safeRequest('/professionals/me', {}),
        safeRequest('/professionals/me/availability', [])
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
          setProfessionalProfile(proProfileJson || null);
          setDashboardData({
            appointmentsScheduled: normalizedAppointments.length,
            completedAppointments: normalizedAppointments.filter((a) => String(a.status || '').toUpperCase() === 'COMPLETED').length,
            profileViews: 0,
            totalRevenue: normalizedAppointments
              .filter((a) => String(a.status || '').toUpperCase() === 'COMPLETED')
              .reduce((sum, a) => sum + getAppointmentAmount(a), 0),
          });
          setHasActivePayments(true);

          setProfileForm({
            name: firstName,
            lastName,
            phone: authMeJson?.phone || user?.phone || '',
            email: authMeJson?.email || user?.email || '',
            currentPassword: '',
            newPassword: '',
            title: proProfileJson?.title || '',
            bio: proProfileJson?.bio || '',
            category: proProfileJson?.category || 'PSYCHOLOGY',
            medicalSpecialty: proProfileJson?.medicalSpecialty || '',
            treatedConditions: Array.isArray(proProfileJson?.treatedConditions) ? proProfileJson.treatedConditions.join(', ') : '',
            consultationModes: Array.isArray(proProfileJson?.consultationModes) ? proProfileJson.consultationModes : [],
            officeAddress: proProfileJson?.officeAddress || '',
            experienceYears: proProfileJson?.experienceYears ?? '',
            certifications: Array.isArray(proProfileJson?.certifications) ? proProfileJson.certifications.join(', ') : '',
            associations: Array.isArray(proProfileJson?.associations) ? proProfileJson.associations.join(', ') : '',
            emergencyDisclaimerAccepted: Boolean(proProfileJson?.emergencyDisclaimerAccepted),
            serviceAreas: Array.isArray(proProfileJson?.serviceAreas) ? proProfileJson.serviceAreas.join(', ') : '',
            languages: Array.isArray(proProfileJson?.languages) ? proProfileJson.languages.join(', ') : '',
            acceptedInsurers: Array.isArray(proProfileJson?.acceptedInsurers) ? proProfileJson.acceptedInsurers : [],
            slotIntervalMinutes: SLOT_INTERVAL_OPTIONS.includes(Number(proProfileJson?.slotIntervalMinutes)) ? Number(proProfileJson.slotIntervalMinutes) : 30,
            presencialRate: proProfileJson?.presencialRate || '',
            telemedicineRate: proProfileJson?.telemedicineRate || '',
            homeVisitRate: proProfileJson?.homeVisitRate || '',
            hourlyRate: proProfileJson?.hourlyRate || '',
          });
          setOfficePhotos(Array.isArray(proProfileJson?.portfolioItems) ? proProfileJson.portfolioItems : []);

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
            category: 'PSYCHOLOGY',
            medicalSpecialty: '',
            treatedConditions: '',
            consultationModes: [],
            officeAddress: '',
            experienceYears: '',
            certifications: '',
            associations: '',
            emergencyDisclaimerAccepted: false,
            serviceAreas: '',
            languages: '',
            acceptedInsurers: [],
            slotIntervalMinutes: 30,
            presencialRate: '',
            telemedicineRate: '',
            homeVisitRate: '',
            hourlyRate: '',
          });
          setOfficePhotos([]);
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

  const professionalPanelData = useMemo(() => {
    const upcoming = appointments
      .filter(isUpcomingAppointment)
      .sort((a, b) => {
        const aTime = a?.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b?.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    const history = appointments.filter((appointment) => !isUpcomingAppointment(appointment));
    const completed = appointments.filter((appointment) => String(appointment.status || '').toUpperCase() === 'COMPLETED');
    const pendingActions = appointments.filter((appointment) => {
      const status = String(appointment.status || '').toUpperCase();
      return ['REQUESTED', 'PENDING_PAYMENT', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS'].includes(status);
    });

    return {
      upcoming,
      history,
      pendingActions,
      revenue: completed.reduce((sum, appointment) => sum + getAppointmentAmount(appointment), 0),
      activeAvailabilityDays: availabilities.filter((slot) => slot.active).length,
      verificationLabel: getVerificationLabel(professionalProfile),
    };
  }, [appointments, availabilities, professionalProfile]);

  const dashboardHeadline = useMemo(() => {
    if (!isProfessional) return 'Control total de tus reservas y seguimiento.';
    if (professionalPanelData.pendingActions.length > 0) return 'Tienes acciones criticas por resolver hoy.';
    if (!hasActivePayments) return 'Pagos en revision por administracion.';
    return 'Operacion estable: agenda, pagos y perfil en regla.';
  }, [hasActivePayments, isProfessional, professionalPanelData.pendingActions.length]);

  const professionalActionChecklist = useMemo(() => {
    if (!isProfessional) return [];
    return [
      {
        id: 'verification',
        label: 'Verificacion de perfil',
        done: professionalProfile?.isVerified || professionalPanelData.verificationLabel === 'Verificado',
        action: () => handleTabChange('profile'),
        actionLabel: 'Revisar perfil',
      },
      {
        id: 'payments',
        label: 'Cobros centralizados',
        done: hasActivePayments,
        action: () => navigate('/settings/payments'),
        actionLabel: 'Ver estado',
      },
      {
        id: 'availability',
        label: 'Disponibilidad semanal definida',
        done: professionalPanelData.activeAvailabilityDays > 0,
        action: () => handleTabChange('availability'),
        actionLabel: 'Ajustar agenda',
      },
    ];
  }, [
    handleTabChange,
    hasActivePayments,
    isProfessional,
    navigate,
    professionalPanelData.activeAvailabilityDays,
    professionalPanelData.verificationLabel,
    professionalProfile?.isVerified,
  ]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await apiFetch('/users/avatar', { method: 'POST', body: formData });
      setAvatarPreview(data.avatarUrl || null);
      updateUser?.({ avatarUrl: data.avatarUrl });
      showToast('Foto actualizada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al actualizar foto', 'error');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleOfficePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setSavingOfficePhoto(true);
    try {
      const data = await apiFetch('/professionals/me/portfolio', { method: 'POST', body: formData });
      if (data?.portfolioItem) {
        setOfficePhotos((prev) => [data.portfolioItem, ...prev]);
      }
      showToast('Foto de consultorio agregada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al subir foto de consultorio', 'error');
    } finally {
      setSavingOfficePhoto(false);
      if (officePhotoInputRef.current) officePhotoInputRef.current.value = '';
    }
  };

  const handleDeleteOfficePhoto = async (itemId) => {
    try {
      await apiFetch(`/professionals/me/portfolio/${itemId}`, { method: 'DELETE' });
      setOfficePhotos((prev) => prev.filter((item) => item.id !== itemId));
      showToast('Foto eliminada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al eliminar foto', 'error');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, _cancelling: true } : a)));
    try {
      await apiFetch(`/appointments/${appointmentId}/cancel`, { method: 'PATCH' });
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
      const sessionData = await apiFetch(`/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        body: JSON.stringify({ forceAuto: false }),
      });

      const tokenData = await apiFetch(`/appointments/${appointment.id}/video-token`);

      await apiFetch(`/appointments/${appointment.id}/video-opened`, {
        method: 'POST',
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
      const data = await apiFetch(`/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

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
      const data = await apiFetch(`/appointments/${appointment.id}/video-session`, {
        method: 'POST',
        body: JSON.stringify({ forceAuto: true, provider: 'jitsi' }),
      });

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

      await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify(userPayload),
      });

      updateUser?.({ name: `${profileForm.name} ${profileForm.lastName}`.trim(), phone: profileForm.phone, email: profileForm.email });

      if (isProfessional) {
        const proPayload = {
          title: profileForm.title,
          bio: profileForm.bio,
          category: profileForm.category,
          medicalSpecialty: profileForm.medicalSpecialty || null,
          treatedConditions: profileForm.treatedConditions,
          consultationModes: Array.isArray(profileForm.consultationModes) ? profileForm.consultationModes : [],
          officeAddress: profileForm.officeAddress,
          experienceYears: profileForm.experienceYears === '' ? null : Number(profileForm.experienceYears),
          certifications: profileForm.certifications,
          associations: profileForm.associations,
          emergencyDisclaimerAccepted: Boolean(profileForm.emergencyDisclaimerAccepted),
          serviceAreas: profileForm.serviceAreas,
          languages: profileForm.languages,
          acceptedInsurers: Array.isArray(profileForm.acceptedInsurers) ? profileForm.acceptedInsurers : [],
          slotIntervalMinutes: Number(profileForm.slotIntervalMinutes) || 30,
          presencialRate: profileForm.presencialRate,
          telemedicineRate: profileForm.telemedicineRate,
          homeVisitRate: profileForm.homeVisitRate,
          hourlyRate: profileForm.hourlyRate,
        };

        await apiFetch('/professionals/me', {
          method: 'PUT',
          body: JSON.stringify(proPayload),
        });
      }

      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      showToast('Perfil actualizado', 'success');
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConfirmTransferPayment = async (appointmentId) => {
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/confirm-transfer`, {
        method: 'PATCH',
      });
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId ? { ...a, ...data.appointment } : a
      )));
      showToast('Pago confirmado y cita agendada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al confirmar pago', 'error');
    }
  };

  const handleConfirmAppointment = async (appointmentId) => {
    setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: 'confirm' }));
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/confirm`, {
        method: 'PATCH',
      });
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId ? { ...a, ...(data.appointment || {}), _cancelling: false } : a
      )));
      showToast('Cita confirmada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al confirmar cita', 'error');
    } finally {
      setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: '' }));
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: 'complete' }));
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/complete`, {
        method: 'PATCH',
      });
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId ? { ...a, ...(data.appointment || {}), _cancelling: false } : a
      )));
      showToast('Cita completada correctamente', 'success');
    } catch (err) {
      showToast(err.message || 'Error al completar cita', 'error');
    } finally {
      setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: '' }));
    }
  };

  const handleNoShowAppointment = async (appointmentId) => {
    setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: 'no-show' }));
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/no-show`, {
        method: 'PATCH',
      });
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId ? { ...a, ...(data.appointment || {}), _cancelling: false } : a
      )));
      showToast('Cita marcada como no-show', 'success');
    } catch (err) {
      showToast(err.message || 'Error al marcar no-show', 'error');
    } finally {
      setAppointmentActionMap((prev) => ({ ...prev, [appointmentId]: '' }));
    }
  };

  const handleToggleAppointmentTimeline = async (appointmentId) => {
    const isOpen = Array.isArray(appointmentTimelineMap[appointmentId]);
    if (isOpen) {
      setAppointmentTimelineMap((prev) => ({ ...prev, [appointmentId]: null }));
      return;
    }

    setAppointmentTimelineLoadingMap((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const timeline = await apiFetch(`/appointments/${appointmentId}/events`);
      setAppointmentTimelineMap((prev) => ({
        ...prev,
        [appointmentId]: Array.isArray(timeline) ? timeline : [],
      }));
    } catch (err) {
      showToast(err.message || 'No se pudo cargar la bitacora de la cita', 'error');
    } finally {
      setAppointmentTimelineLoadingMap((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleOpenContextChat = (appointment) => {
    const isProfessionalView = isProfessional;
    const counterpart = isProfessionalView ? appointment?.client : appointment?.professional?.user;
    if (!counterpart?.id) {
      showToast('No se pudo identificar el contacto para esta cita', 'error');
      return;
    }
    setChatBootstrap({
      receiverId: counterpart.id,
      receiverName: counterpart.name || (isProfessionalView ? 'Paciente' : 'Profesional'),
      appointmentId: appointment.id,
    });
    handleTabChange('messages');
  };

  const handleSaveAvailability = async () => {
    const payload = availabilities.filter((a) => a.active).map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));
    try {
      await apiFetch('/professionals/me/availability', {
        method: 'PUT',
        body: JSON.stringify({ availabilities: payload }),
      });
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

      <main className="container dashboard-premium dashboard-shell">
        <header style={{ marginBottom: '1.5rem' }}>
          <p className="text-label-md" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>{isProfessional ? 'PANEL DEL DOCTOR' : 'PANEL DEL CLIENTE'}</p>
          <h1 className="text-headline-md" style={{ color: 'var(--primary)' }}>{isProfessional ? 'Consultas, pacientes y operaciones' : 'Dashboard cliente'}</h1>
        </header>

        <DashboardTabNav tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'overview' && (
          <section className="dashboard-overview">
            <div className="card glass-card dashboard-surface-1 dashboard-card-pad" style={{ border: '1px solid var(--outline-variant)' }}>
              <p className="dashboard-micro" style={{ margin: 0, color: 'var(--on-surface-variant)', letterSpacing: '0.08em', fontWeight: 700 }}>
                {isProfessional ? 'RESUMEN OPERATIVO' : 'RESUMEN DE CLIENTE'}
              </p>
              <h2 style={{ margin: '0.35rem 0 0.45rem', fontFamily: 'Manrope', color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }}>
                {dashboardHeadline}
              </h2>
              <p className="dashboard-micro" style={{ margin: 0, color: 'var(--on-surface-variant)' }}>
                {isProfessional
                  ? `Proximas ${professionalPanelData.upcoming.length} · Pendientes ${professionalPanelData.pendingActions.length} · Historial ${professionalPanelData.history.length}`
                  : `Agendadas ${dashboardData.appointmentsScheduled} · Completadas ${dashboardData.completedAppointments}`}
              </p>
            </div>

            <div className="dashboard-kpi-grid">
              <div className="card glass-card dashboard-surface-1 dashboard-card-pad">
                <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>{isProfessional ? 'Citas proximas' : 'Citas agendadas'}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{isProfessional ? professionalPanelData.upcoming.length : dashboardData.appointmentsScheduled}</p>
              </div>

              <div className="card glass-card dashboard-surface-2 dashboard-card-pad">
                <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Citas completadas</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{dashboardData.completedAppointments}</p>
              </div>

              <div className="card glass-card dashboard-surface-2 dashboard-card-pad">
                <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Ingresos</p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>{isProfessional ? formatCurrency(professionalPanelData.revenue) : 'Proximamente'}</p>
              </div>

              {isProfessional && (
                <div className="card glass-card dashboard-surface-1 dashboard-card-pad">
                  <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Perfil/verificacion</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: professionalProfile?.isVerified ? '#16a34a' : 'var(--secondary)' }}>{professionalPanelData.verificationLabel}</p>
                </div>
              )}
            </div>

            {isProfessional && (
              <div className="card glass-card dashboard-card-pad" style={{ border: '1px solid var(--outline-variant)', display: 'grid', gap: '0.75rem' }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>Acciones rapidas del consultorio</p>
                <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={() => handleTabChange('appointments')}>Gestionar citas</button>
                  <button type="button" className="btn btn-outline" onClick={() => handleTabChange('availability')}>Editar disponibilidad</button>
                  <button type="button" className="btn btn-outline" onClick={() => handleTabChange('profile')}>Perfil/verificacion</button>
                  <button type="button" className="btn btn-outline" onClick={() => handleTabChange('messages')}>Mensajes</button>
                  <button type="button" className="btn btn-outline" onClick={() => navigate('/settings/payments')}>Estado de pagos</button>
                </div>
              </div>
            )}

            {isProfessional && (
              <div className="card glass-card dashboard-surface-2 dashboard-card-pad" style={{ border: '1px solid var(--outline-variant)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                  <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Checklist operativo</h3>
                  <p className="dashboard-micro" style={{ margin: 0, color: 'var(--on-surface-variant)' }}>
                    {professionalActionChecklist.filter((item) => item.done).length}/{professionalActionChecklist.length} completado
                  </p>
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {professionalActionChecklist.map((item) => (
                    <div key={item.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: item.done ? '#16a34a' : 'var(--secondary)' }}>
                          {item.done ? 'check_circle' : 'pending'}
                        </span>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--on-surface)' }}>{item.label}</p>
                      </div>
                      {!item.done && (
                        <button type="button" className="btn btn-outline dashboard-tiny-btn" onClick={item.action}>
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card glass-card dashboard-card-pad">
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>{isProfessional ? 'Agenda inmediata' : 'Actividad reciente'}</h3>
              {(isProfessional ? professionalPanelData.upcoming : appointments).slice(0, 4).length === 0 ? (
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>{isProfessional ? 'Sin citas proximas.' : 'Sin actividad reciente.'}</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {(isProfessional ? professionalPanelData.upcoming : appointments).slice(0, 4).map((app) => {
                    const paymentSummary = getAppointmentPaymentSummary(app);
                    const counterpart = isProfessional ? app.client : app.professional?.user;
                    const normalizedStatus = String(app.status || '').toUpperCase();
                    const statusTone = normalizedStatus === 'PENDING_PAYMENT'
                      ? '#f59e0b'
                      : normalizedStatus === 'REQUESTED'
                        ? '#38bdf8'
                        : normalizedStatus === 'CONFIRMED' || normalizedStatus === 'SCHEDULED'
                          ? '#16a34a'
                          : 'var(--on-surface-variant)';
                    return (
                      <div key={app.id} style={{ padding: '0.75rem 0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                        <p className="dashboard-micro" style={{ color: 'var(--secondary)', fontWeight: 700 }}>{counterpart?.name || (isProfessional ? 'Paciente' : 'Profesional')}</p>
                        <p style={{ color: 'var(--on-surface)', fontWeight: 600, fontSize: '0.875rem' }}>{app.dateLabel} · {app.timeLabel}</p>
                        <p className="dashboard-status-text" style={{ color: statusTone, fontWeight: 700 }}>{normalizedStatus}</p>
                        {isProfessional && paymentSummary && (
                          <p className="dashboard-status-text" style={{ color: 'var(--secondary)', fontWeight: 700 }}>
                            {paymentSummary.label}: <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>{paymentSummary.detail}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isProfessional && (
              <div className="dashboard-kpi-grid">
                <div className="card glass-card dashboard-surface-1 dashboard-card-pad">
                  <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Acciones pendientes</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{professionalPanelData.pendingActions.length}</p>
                </div>
                <div className="card glass-card dashboard-surface-2 dashboard-card-pad">
                  <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Dias disponibles</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{professionalPanelData.activeAvailabilityDays}</p>
                </div>
                <div className="card glass-card dashboard-surface-1 dashboard-card-pad">
                  <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Pacientes/historial</p>
                  <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{professionalPanelData.history.length}</p>
                </div>
                <div className="card glass-card dashboard-surface-2 dashboard-card-pad">
                  <p className="dashboard-micro" style={{ color: 'var(--on-surface-variant)' }}>Pagos</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, color: hasActivePayments ? '#16a34a' : 'var(--secondary)' }}>{hasActivePayments ? 'Centralizado' : 'Revision'}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'appointments' && (
          <section className="card glass-card" style={{ padding: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--primary)' }}>{isProfessional ? 'Pacientes, citas proximas e historicas' : 'Mis citas'}</h2>
            {isProfessional && (
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Proximas: <strong>{professionalPanelData.upcoming.length}</strong> · Historicas: <strong>{professionalPanelData.history.length}</strong>
              </p>
            )}
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
                  const paymentSummary = getAppointmentPaymentSummary(app);
                  const showConfirmTransferButton = isProfessional && canConfirmTransferPayment(app);
                  const showConfirmButton = isProfessional && canConfirmAppointment(app);
                  const canCompleteAppointment = isProfessional && hasAction(app, 'COMPLETE_APPOINTMENT');
                  const canNoShowAppointment = isProfessional && hasAction(app, 'MARK_NO_SHOW');
                  const canCancelAppointment = hasAction(app, 'CANCEL_APPOINTMENT');
                  const isConfirmingAppointment = appointmentActionMap[app.id] === 'confirm';
                  const isCompletingAppointment = appointmentActionMap[app.id] === 'complete';
                  const isNoShowAppointment = appointmentActionMap[app.id] === 'no-show';

                  return (
                    <div key={app.id} className="dashboard-appointment-item" style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
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
                        <p className="dashboard-status-text" style={{ color: 'var(--on-surface-variant)' }}>{app.status}</p>
                        <p className="dashboard-status-text" style={{ color: 'var(--secondary)' }}>Estado operativo: {app.state || normalizedStatus}</p>
                        {isProfessional && paymentSummary && (
                          <p className="dashboard-status-text" style={{ color: paymentSummary.label === 'Pago confirmado' ? '#16a34a' : 'var(--secondary)', fontWeight: 700 }}>
                            {paymentSummary.label}: <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>{paymentSummary.detail}</span>
                          </p>
                        )}
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
                        {showConfirmTransferButton && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmTransferPayment(app.id)}
                            style={{ marginTop: '0.375rem', fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                          >
                            Confirmar pago y agendar
                          </button>
                        )}
                        {showConfirmButton && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleConfirmAppointment(app.id)}
                            disabled={isConfirmingAppointment}
                            style={{ marginTop: '0.375rem', fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                          >
                            {isConfirmingAppointment ? 'Confirmando...' : 'Confirmar cita'}
                          </button>
                        )}
                        {(canCompleteAppointment || canNoShowAppointment) && (
                          <div style={{ marginTop: '0.375rem', display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                            {canCompleteAppointment && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleCompleteAppointment(app.id)}
                                disabled={isCompletingAppointment || isNoShowAppointment}
                                style={{ fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                              >
                                {isCompletingAppointment ? 'Completando...' : 'Completar cita'}
                              </button>
                            )}
                            {canNoShowAppointment && (
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleNoShowAppointment(app.id)}
                                disabled={isCompletingAppointment || isNoShowAppointment}
                                style={{ fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                              >
                                {isNoShowAppointment ? 'Marcando...' : 'Marcar no-show'}
                              </button>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleToggleAppointmentTimeline(app.id)}
                          disabled={Boolean(appointmentTimelineLoadingMap[app.id])}
                          style={{ marginTop: '0.375rem', fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                        >
                          {appointmentTimelineLoadingMap[app.id] ? 'Cargando bitacora...' : Array.isArray(appointmentTimelineMap[app.id]) ? 'Ocultar bitacora' : 'Ver bitacora'}
                        </button>
                        {Array.isArray(appointmentTimelineMap[app.id]) && (
                          <div style={{ marginTop: '0.5rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'grid', gap: '0.35rem' }}>
                            {appointmentTimelineMap[app.id].length === 0 ? (
                              <p className="dashboard-status-text" style={{ color: 'var(--on-surface-variant)' }}>Sin eventos registrados.</p>
                            ) : (
                              appointmentTimelineMap[app.id].map((evt) => (
                                <p key={evt.id} className="dashboard-status-text" style={{ color: 'var(--on-surface-variant)' }}>
                                  {evt.timelineType || evt.type || evt.event} · {evt.happenedAt ? new Date(evt.happenedAt).toLocaleString('es-MX') : 'N/D'}
                                </p>
                              ))
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => handleOpenContextChat(app)}
                          style={{ marginTop: '0.375rem', fontSize: '0.75rem', padding: '0.45rem 0.7rem' }}
                        >
                          Abrir chat de cita
                        </button>
                      </div>
                      {canCancelAppointment && (
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
            <ChatWindow
              initialReceiverId={chatBootstrap?.receiverId || null}
              initialReceiverName={chatBootstrap?.receiverName || null}
              initialAppointmentId={chatBootstrap?.appointmentId || null}
            />
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="card glass-card" style={{ padding: '1rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>{isProfessional ? 'Perfil y verificacion' : 'Ajustes de perfil'}</h2>

            {isProfessional && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', padding: '0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>Estado de verificacion</p>
                  <p style={{ margin: 0, color: professionalProfile?.isVerified ? '#16a34a' : 'var(--secondary)', fontWeight: 800 }}>{professionalPanelData.verificationLabel}</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={() => navigate('/verification')}>Subir documentos</button>
              </div>
            )}

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
                  <textarea className="input-field" placeholder="Padecimientos que atiende (separados por coma)" rows={2} value={profileForm.treatedConditions} onChange={(e) => setProfileForm((p) => ({ ...p, treatedConditions: e.target.value }))} />
                  <input className="input-field" placeholder="Direccion de consultorio" value={profileForm.officeAddress} onChange={(e) => setProfileForm((p) => ({ ...p, officeAddress: e.target.value }))} />
                  <input className="input-field" type="number" min="0" step="1" placeholder="Años de experiencia" value={profileForm.experienceYears} onChange={(e) => setProfileForm((p) => ({ ...p, experienceYears: e.target.value }))} />
                  <textarea className="input-field" placeholder="Certificaciones (separadas por coma)" rows={2} value={profileForm.certifications} onChange={(e) => setProfileForm((p) => ({ ...p, certifications: e.target.value }))} />
                  <textarea className="input-field" placeholder="Asociaciones profesionales (separadas por coma)" rows={2} value={profileForm.associations} onChange={(e) => setProfileForm((p) => ({ ...p, associations: e.target.value }))} />
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', color: 'var(--on-surface)', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={profileForm.emergencyDisclaimerAccepted}
                      onChange={(e) => setProfileForm((p) => ({ ...p, emergencyDisclaimerAccepted: e.target.checked }))}
                      style={{ marginTop: '0.2rem', accentColor: 'var(--secondary)' }}
                    />
                    Entiendo que mi perfil debe mostrar que no atiendo emergencias medicas por esta plataforma.
                  </label>
                  <div style={{ display: 'grid', gap: '0.65rem', padding: '0.75rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>Fotos reales del consultorio</p>
                      <input ref={officePhotoInputRef} type="file" accept="image/*" onChange={handleOfficePhotoUpload} style={{ display: 'none' }} />
                      <button type="button" className="btn btn-outline" onClick={() => officePhotoInputRef.current?.click()} disabled={savingOfficePhoto}>
                        {savingOfficePhoto ? 'Subiendo...' : 'Agregar foto'}
                      </button>
                    </div>
                    {officePhotos.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                        {officePhotos.map((item) => (
                          <div key={item.id} style={{ position: 'relative', minHeight: '88px' }}>
                            <img src={item.imageUrl} alt="Consultorio" style={{ width: '100%', height: '88px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }} />
                            <button type="button" onClick={() => handleDeleteOfficePhoto(item.id)} aria-label="Eliminar foto" style={{ position: 'absolute', top: '0.35rem', right: '0.35rem', width: '1.75rem', height: '1.75rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(10,14,21,0.82)', color: 'var(--primary)', cursor: 'pointer' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input className="input-field" placeholder="Zonas de atencion (separadas por coma)" value={profileForm.serviceAreas} onChange={(e) => setProfileForm((p) => ({ ...p, serviceAreas: e.target.value }))} />
                  <input className="input-field" placeholder="Idiomas (separados por coma)" value={profileForm.languages} onChange={(e) => setProfileForm((p) => ({ ...p, languages: e.target.value }))} />
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
                  <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                    <input className="input-field" type="number" min="0" step="50" placeholder="Precio presencial" value={profileForm.presencialRate} onChange={(e) => setProfileForm((p) => ({ ...p, presencialRate: e.target.value }))} />
                    <input className="input-field" type="number" min="0" step="50" placeholder="Precio online" value={profileForm.telemedicineRate} onChange={(e) => setProfileForm((p) => ({ ...p, telemedicineRate: e.target.value }))} />
                    <input className="input-field" type="number" min="0" step="50" placeholder="Precio domicilio" value={profileForm.homeVisitRate} onChange={(e) => setProfileForm((p) => ({ ...p, homeVisitRate: e.target.value }))} />
                  </div>
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

