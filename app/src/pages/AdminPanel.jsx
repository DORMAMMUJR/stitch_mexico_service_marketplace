import React, { useEffect, useMemo, useState } from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';
import { apiFetch } from '../lib/api';

const defaultStats = {
  totalUsers: 0,
  verifiedProfessionals: 0,
  totalOrders: 0,
  completedRevenue: 0,
  pendingPaymentAppointments: 0,
  activeDisputes: 0,
  pendingManualPayouts: 0,
};

const defaultPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

export function AdminPanel() {
  const [pendingDocs, setPendingDocs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [payoutQueue, setPayoutQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeProfessionals, setActiveProfessionals] = useState([]);
  const [specialtyKpis, setSpecialtyKpis] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [operators, setOperators] = useState([]);
  const [creatingOperator, setCreatingOperator] = useState(false);
  const [operatorForm, setOperatorForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalError, setOperationalError] = useState('');
  const [supportLink, setSupportLink] = useState(localStorage.getItem('platform_support_link') || 'https://wa.me/');
  const [linkDrafts, setLinkDrafts] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const [featuredSavingMap, setFeaturedSavingMap] = useState({});
  const [reviewDeletingMap, setReviewDeletingMap] = useState({});
  const [disputeActionMap, setDisputeActionMap] = useState({});
  const [payoutActionMap, setPayoutActionMap] = useState({});
  const [orderTimelineMap, setOrderTimelineMap] = useState({});
  const [orderTimelineLoadingMap, setOrderTimelineLoadingMap] = useState({});

  const [stats, setStats] = useState(defaultStats);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');

  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState(defaultPagination);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState('');
  const [updatingRoleMap, setUpdatingRoleMap] = useState({});
  const [docActionMap, setDocActionMap] = useState({});

  const { showToast } = useToast();

  const loadOperationalData = async () => {
    try {
      setOperationalLoading(true);
      setOperationalError('');
      const [docsData, disputesData, payoutData, apptData, prosData, opsData, kpisData, reviewsData] = await Promise.all([
        apiFetch('/admin/verifications/pending'),
        apiFetch('/orders/admin/disputes').catch(() => []),
        apiFetch('/admin/payouts/queue').catch(() => []),
        apiFetch('/admin/appointments/upcoming').catch(() => []),
        apiFetch('/admin/professionals/active').catch(() => []),
        apiFetch('/admin/operators').catch(() => []),
        apiFetch('/admin/specialty-kpis').catch(() => []),
        apiFetch('/admin/reviews').catch(() => []),
      ]);

      setPendingDocs(Array.isArray(docsData) ? docsData : []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
      setPayoutQueue(Array.isArray(payoutData) ? payoutData : []);
      setAppointments(Array.isArray(apptData) ? apptData : []);
      setActiveProfessionals(Array.isArray(prosData) ? prosData : []);
      setOperators(Array.isArray(opsData) ? opsData : []);
      setSpecialtyKpis(Array.isArray(kpisData) ? kpisData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);

      const draftSeed = {};
      (Array.isArray(apptData) ? apptData : []).forEach((a) => {
        draftSeed[a.id] = a.meetingLink || '';
      });
      setLinkDrafts(draftSeed);
    } catch (err) {
      const message = err.message || 'No se pudieron cargar los datos de administracion';
      setOperationalError(message);
      showToast(message, 'error');
    } finally {
      setOperationalLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError('');
      const data = await apiFetch('/admin/stats');

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        verifiedProfessionals: Number(data.verifiedProfessionals || 0),
        totalOrders: Number(data.totalOrders || 0),
        completedRevenue: Number(data.completedRevenue || 0),
        pendingPaymentAppointments: Number(data.pendingPaymentAppointments || data.appointments?.pendingPayment || 0),
        activeDisputes: Number(data.activeDisputes || data.disputes?.active || 0),
        pendingManualPayouts: Number(data.pendingManualPayouts || data.payouts?.pendingManual || 0),
      });
    } catch (err) {
      setStatsError(err.message || 'Error al cargar estadisticas');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUsers = async ({ page = 1, query = usersSearchQuery } = {}) => {
    try {
      setUsersLoading(true);
      setUsersError('');
      const encodedQuery = encodeURIComponent((query || '').trim());
      const data = await apiFetch(`/admin/users?page=${page}&limit=${usersPagination.limit}&search=${encodedQuery}`);

      const pagination = data.pagination || {};
      setUsers(Array.isArray(data.items) ? data.items : []);
      setUsersPagination((prev) => ({
        ...prev,
        page: Number(pagination.page || page),
        total: Number(pagination.total || 0),
        totalPages: Number(pagination.totalPages || 1),
      }));
    } catch (err) {
      setUsersError(err.message || 'Error al cargar usuarios');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadOperationalData();
    loadStats();
    loadUsers({ page: 1, query: '' });
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
      showToast('Ingresa un link valido (http/https)', 'error');
      return;
    }

    setSavingMap((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const data = await apiFetch(`/admin/appointments/${appointmentId}/meeting-link`, {
        method: 'PATCH',
        body: JSON.stringify({ meetingLink: link }),
      });

      showToast('Link de cita enviado a cliente y profesional', 'success');
      const nextMeetingLink = data?.appointment?.meetingLink || link;
      const nextVideoSession = data?.appointment?.videoSession || null;
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId
          ? { ...a, meetingLink: nextMeetingLink, videoSession: nextVideoSession }
          : a
      )));
      setLinkDrafts((prev) => ({ ...prev, [appointmentId]: nextMeetingLink }));
    } catch (err) {
      showToast(err.message || 'Error al enviar link', 'error');
    } finally {
      setSavingMap((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  const handleAutoGenerateVideo = async (appointmentId) => {
    setSavingMap((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const data = await apiFetch(`/appointments/${appointmentId}/video-session`, {
        method: 'POST',
        body: JSON.stringify({ forceAuto: true, provider: 'jitsi' }),
      });

      const nextMeetingLink = data?.meetingLink || data?.videoSession?.joinUrl || '';
      const nextVideoSession = data?.videoSession || null;
      setAppointments((prev) => prev.map((a) => (
        a.id === appointmentId
          ? { ...a, meetingLink: nextMeetingLink, videoSession: nextVideoSession }
          : a
      )));
      setLinkDrafts((prev) => ({ ...prev, [appointmentId]: nextMeetingLink }));
      showToast('Sala automatica generada para la cita', 'success');
    } catch (err) {
      showToast(err.message || 'Error al generar sala automatica', 'error');
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

  const handleToggleFeatured = async (professional, nextFeatured, nextRank = professional.featuredRank || 0) => {
    setFeaturedSavingMap((prev) => ({ ...prev, [professional.id]: true }));
    try {
      const updated = await apiFetch(`/admin/professionals/${professional.id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({
          isFeatured: nextFeatured,
          featuredRank: Number(nextRank || 0),
        }),
      });
      setActiveProfessionals((prev) => prev.map((pro) => (pro.id === professional.id ? updated : pro)));
      showToast('Destacado actualizado', 'success');
    } catch (err) {
      showToast(err.message || 'Error al actualizar destacado', 'error');
    } finally {
      setFeaturedSavingMap((prev) => ({ ...prev, [professional.id]: false }));
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!reviewId) return;
    const ok = window.confirm('Eliminar esta resena publica?');
    if (!ok) return;
    setReviewDeletingMap((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await apiFetch(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      showToast('Resena eliminada', 'success');
    } catch (err) {
      showToast(err.message || 'Error al eliminar resena', 'error');
    } finally {
      setReviewDeletingMap((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleResolveDispute = async (orderId, resolution) => {
    if (!orderId || !resolution) return;
    setDisputeActionMap((prev) => ({ ...prev, [orderId]: resolution }));
    try {
      const response = await apiFetch(`/orders/${orderId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution }),
      });
      setDisputes((prev) => prev.filter((order) => order.id !== orderId));
      if (response?.order) {
        setPayoutQueue((prev) => [response.order, ...prev.filter((item) => item.id !== orderId)]);
      }
      showToast('Disputa resuelta', 'success');
      await loadStats();
    } catch (err) {
      showToast(err.message || 'Error al resolver disputa', 'error');
    } finally {
      setDisputeActionMap((prev) => ({ ...prev, [orderId]: '' }));
    }
  };

  const handlePayoutSettle = async (orderId, action) => {
    if (!orderId || !action) return;
    let reason = '';
    if (action === 'FAIL') {
      reason = window.prompt('Motivo del fallo de payout:') || '';
      if (!reason.trim()) return;
    }

    setPayoutActionMap((prev) => ({ ...prev, [orderId]: action }));
    try {
      const response = await apiFetch(`/admin/payouts/${orderId}/settle`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const updated = response?.order;
      if (updated) {
        setPayoutQueue((prev) => {
          const next = prev.map((item) => (item.id === updated.id ? updated : item));
          if (!next.find((item) => item.id === updated.id)) return [updated, ...next];
          return next.filter((item) => ['PAYOUT_INICIADO', 'PAYOUT_FALLIDO'].includes(String(item.status || '').toUpperCase()));
        });
      }
      showToast('Cola de payout actualizada', 'success');
      await loadStats();
    } catch (err) {
      showToast(err.message || 'Error al actualizar payout', 'error');
    } finally {
      setPayoutActionMap((prev) => ({ ...prev, [orderId]: '' }));
    }
  };

  const handleToggleOrderTimeline = async (orderId) => {
    const isOpen = Array.isArray(orderTimelineMap[orderId]);
    if (isOpen) {
      setOrderTimelineMap((prev) => ({ ...prev, [orderId]: null }));
      return;
    }

    setOrderTimelineLoadingMap((prev) => ({ ...prev, [orderId]: true }));
    try {
      const timeline = await apiFetch(`/orders/${orderId}/timeline`);
      setOrderTimelineMap((prev) => ({ ...prev, [orderId]: Array.isArray(timeline) ? timeline : [] }));
    } catch (err) {
      showToast(err.message || 'No se pudo cargar la bitacora de la orden', 'error');
    } finally {
      setOrderTimelineLoadingMap((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    const payload = {
      name: operatorForm.name.trim(),
      email: operatorForm.email.trim().toLowerCase(),
      password: operatorForm.password,
    };

    if (!payload.name || !payload.email || !payload.password) {
      showToast('Completa nombre, correo y contrasena', 'error');
      return;
    }

    if (payload.password !== operatorForm.confirmPassword) {
      showToast('Las contrasenas no coinciden', 'error');
      return;
    }

    setCreatingOperator(true);
    try {
      const data = await apiFetch('/admin/operators', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOperators((prev) => [data, ...prev]);
      setOperatorForm({ name: '', email: '', password: '', confirmPassword: '' });
      showToast('Operador ADMIN creado correctamente', 'success');
    } catch (err) {
      showToast(err.message || 'Error al crear operador', 'error');
    } finally {
      setCreatingOperator(false);
    }
  };

  const handleUsersSearch = (e) => {
    e.preventDefault();
    const query = usersSearchInput.trim();
    setUsersSearchQuery(query);
    loadUsers({ page: 1, query });
  };

  const handleUpdateRole = async (userId, role) => {
    if (!userId || !role) return;
    setUpdatingRoleMap((prev) => ({ ...prev, [userId]: true }));
    try {
      await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      showToast('Rol actualizado correctamente', 'success');
      await Promise.all([
        loadUsers({ page: usersPagination.page, query: usersSearchQuery }),
        loadStats(),
      ]);
    } catch (err) {
      showToast(err.message || 'Error al actualizar rol', 'error');
    } finally {
      setUpdatingRoleMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser?.id) return;

    setDeletingUserId(confirmDeleteUser.id);
    try {
      await apiFetch(`/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
      });

      showToast('Usuario eliminado correctamente', 'success');
      setConfirmDeleteUser(null);
      await Promise.all([
        loadUsers({ page: usersPagination.page, query: usersSearchQuery }),
        loadStats(),
      ]);
    } catch (err) {
      showToast(err.message || 'Error al eliminar usuario', 'error');
    } finally {
      setDeletingUserId('');
    }
  };

  const handleApproveVerificationDoc = async (docId) => {
    if (!docId) return;
    setDocActionMap((prev) => ({ ...prev, [docId]: 'approve' }));
    try {
      await apiFetch(`/admin/verifications/${docId}/approve`, { method: 'PATCH' });
      setPendingDocs((prev) => prev.filter((doc) => doc.id !== docId));
      showToast('Documento aprobado correctamente', 'success');
      await loadStats();
    } catch (err) {
      showToast(err.message || 'Error al aprobar documento', 'error');
    } finally {
      setDocActionMap((prev) => ({ ...prev, [docId]: '' }));
    }
  };

  const handleRejectVerificationDoc = async (docId) => {
    if (!docId) return;
    const reason = window.prompt('Motivo de rechazo:');
    if (!reason || !reason.trim()) return;
    setDocActionMap((prev) => ({ ...prev, [docId]: 'reject' }));
    try {
      await apiFetch(`/admin/verifications/${docId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setPendingDocs((prev) => prev.filter((doc) => doc.id !== docId));
      showToast('Documento rechazado', 'success');
      await loadStats();
    } catch (err) {
      showToast(err.message || 'Error al rechazar documento', 'error');
    } finally {
      setDocActionMap((prev) => ({ ...prev, [docId]: '' }));
    }
  };

  const statsCards = [
    { key: 'users', label: 'Usuarios Totales', value: stats.totalUsers },
    { key: 'verified', label: 'Profesionales Verificados', value: stats.verifiedProfessionals },
    { key: 'orders', label: 'Ordenes Totales', value: stats.totalOrders },
    { key: 'pending-payment', label: 'Citas Pendientes de Pago', value: stats.pendingPaymentAppointments },
    { key: 'disputes', label: 'Disputas Activas', value: stats.activeDisputes },
    { key: 'manual-payouts', label: 'Payouts Manuales Pendientes', value: stats.pendingManualPayouts },
    { key: 'reviews', label: 'Resenas en Moderacion', value: reviews.length },
    {
      key: 'revenue',
      label: 'Ingresos en Ordenes Completadas',
      value: `$${stats.completedRevenue.toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN`,
    },
  ];

  return (
    <>
      <NavbarIntecnia />
      <div className="container admin-shell">
        <h1 style={{ fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '2rem', fontWeight: 700 }}>Panel Superadmin</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Control total de plataforma, usuarios y operacion.</p>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Resumen General</h2>
          {statsLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando resumen...</p>
          ) : statsError ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <p style={{ color: '#ef4444' }}>{statsError}</p>
              <button className="btn btn-outline" onClick={loadStats}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {statsCards.map((card) => (
                <div key={card.key} className="glass-card" style={{ padding: '1rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>{card.label}</p>
                  <p style={{ color: 'var(--primary)', fontSize: '1.3rem', fontWeight: 800 }}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Reportes de usuarios</h2>

          <form onSubmit={handleUsersSearch} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
            <input
              className="input-field"
              type="search"
              placeholder="Buscar por nombre o correo"
              value={usersSearchInput}
              onChange={(e) => setUsersSearchInput(e.target.value)}
              style={{ flex: 1, minWidth: '260px' }}
            />
            <button type="submit" className="btn btn-primary">Buscar</button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setUsersSearchInput('');
                setUsersSearchQuery('');
                loadUsers({ page: 1, query: '' });
              }}
            >
              Limpiar
            </button>
          </form>

          {usersError && (
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <p style={{ color: '#ef4444', margin: 0 }}>{usersError}</p>
              <button className="btn btn-outline" onClick={() => loadUsers({ page: usersPagination.page, query: usersSearchQuery })}>Reintentar</button>
            </div>
          )}

          <div className="admin-table-shell">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Nombre</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Correo</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Rol</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Verificacion</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Registro</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '0.9rem', color: 'var(--on-surface-variant)' }}>Cargando usuarios...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '0.9rem', color: 'var(--on-surface-variant)' }}>No se encontraron usuarios.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface)' }}>{user.name || 'Sin nombre'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{user.email}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>{user.role}</span>
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            disabled={Boolean(updatingRoleMap[user.id]) || user.role === 'ADMIN'}
                            style={{ background: 'var(--surface-container)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)', borderRadius: '6px', padding: '0.2rem 0.35rem', fontSize: '0.72rem' }}
                          >
                            <option value="CLIENT">CLIENT</option>
                            <option value="PROFESSIONAL">PROFESSIONAL</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: user.accountStatus === 'ACTIVO' ? '#4ade80' : '#f59e0b', fontWeight: 700 }}>
                        {user.accountStatus || 'ACTIVO'}
                      </td>
                      <td style={{ padding: '0.75rem', color: user.verificationStatus === 'APPROVED' ? '#4ade80' : 'var(--on-surface-variant)' }}>
                        {user.verificationStatus || 'N/D'}
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX') : 'N/D'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          className="btn btn-outline"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => setConfirmDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                        >
                          {deletingUserId === user.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>
              {usersPagination.total} usuarios - Pagina {usersPagination.page} de {usersPagination.totalPages}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                disabled={usersPagination.page <= 1 || usersLoading}
                onClick={() => loadUsers({ page: usersPagination.page - 1, query: usersSearchQuery })}
              >
                Anterior
              </button>
              <button
                className="btn btn-outline"
                disabled={usersPagination.page >= usersPagination.totalPages || usersLoading}
                onClick={() => loadUsers({ page: usersPagination.page + 1, query: usersSearchQuery })}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        <div className="card glass-card admin-section-card">
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Link principal de contacto/soporte</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={supportLink} onChange={(e) => setSupportLink(e.target.value)} className="input-field" placeholder="https://wa.me/521..." style={{ flex: 1, minWidth: '260px' }} />
            <button className="btn btn-primary" onClick={saveSupportLink}>Guardar link</button>
          </div>
        </div>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Gestion de operadores ADMIN</h2>
          <form onSubmit={handleCreateOperator} style={{ display: 'grid', gap: '0.625rem', marginBottom: '1rem' }}>
            <input
              className="input-field"
              placeholder="Nombre completo"
              value={operatorForm.name}
              onChange={(e) => setOperatorForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="input-field"
              type="email"
              placeholder="correo@dominio.com"
              value={operatorForm.email}
              onChange={(e) => setOperatorForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="input-field"
              type="password"
              placeholder="Contrasena segura"
              value={operatorForm.password}
              onChange={(e) => setOperatorForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <input
              className="input-field"
              type="password"
              placeholder="Confirmar contrasena"
              value={operatorForm.confirmPassword}
              onChange={(e) => setOperatorForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
            <button className="btn btn-primary" type="submit" disabled={creatingOperator}>
              {creatingOperator ? 'Creando operador...' : 'Crear operador ADMIN'}
            </button>
          </form>

          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {operators.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>No hay operadores registrados.</p>
            ) : (
              operators.map((op) => (
                <div key={op.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem' }}>
                  <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem' }}>{op.name}</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>{op.email}</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
                    Creado: {op.createdAt ? new Date(op.createdAt).toLocaleString('es-MX') : 'N/D'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Resumen rapido</h2>
          {operationalLoading ? (
            <p>Cargando...</p>
          ) : operationalError ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <p style={{ color: '#ef4444' }}>{operationalError}</p>
              <button className="btn btn-outline" onClick={loadOperationalData}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
              <p style={{ color: 'var(--on-surface-variant)' }}>Verificaciones pendientes: <strong>{pendingDocs.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Disputas activas: <strong>{disputes.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Payouts manuales: <strong>{payoutQueue.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Citas proximas: <strong>{appointments.length}</strong></p>
            </div>
          )}
        </div>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>KPIs por especialidad</h2>
          {operationalLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando KPIs...</p>
          ) : specialtyKpis.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Aun no hay datos por especialidad.</p>
          ) : (
            <div className="admin-table-shell">
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['Especialidad', 'Profesionales', 'Verificados', 'Citas', 'Completadas', 'Rating', 'Ingresos'].map((label) => (
                      <th key={label} style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem' }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specialtyKpis.map((row) => (
                    <tr key={row.specialty} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface)', fontWeight: 700 }}>{row.specialty}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{row.professionals}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{row.verifiedProfessionals}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{row.appointments}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{row.completedAppointments}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--on-surface-variant)' }}>{row.averageRating || 'N/D'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--primary)', fontWeight: 800 }}>${Number(row.completedRevenue || 0).toLocaleString('es-MX')} MXN</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Disputas</h2>
          {operationalLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando disputas...</p>
          ) : disputes.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay disputas activas.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {disputes.map((order) => (
                <div key={order.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'grid', gap: '0.35rem' }}>
                  <p style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>Orden {order.id}</p>
                  <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.82rem' }}>
                    Cliente: {order.client?.name || 'N/D'} · Profesional: {order.professional?.user?.name || 'N/D'}
                  </p>
                  <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.82rem' }}>
                    Motivo: {order.disputeReason || 'Sin motivo registrado'} · Monto: ${Number(order.agreedPrice || 0).toLocaleString('es-MX')} {order.currency || 'MXN'}
                  </p>
                  <p style={{ color: 'var(--secondary)', margin: 0, fontSize: '0.78rem' }}>
                    Estado operativo: {order.state || order.status} · Pago: {order.paymentState || 'N/A'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleResolveDispute(order.id, 'FAVOR_CLIENT')}
                      disabled={Boolean(disputeActionMap[order.id])}
                    >
                      {disputeActionMap[order.id] === 'FAVOR_CLIENT' ? 'Resolviendo...' : 'Fallo a cliente'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleResolveDispute(order.id, 'FAVOR_PROFESSIONAL')}
                      disabled={Boolean(disputeActionMap[order.id])}
                    >
                      {disputeActionMap[order.id] === 'FAVOR_PROFESSIONAL' ? 'Resolviendo...' : 'Fallo a profesional'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleToggleOrderTimeline(order.id)}
                      disabled={Boolean(orderTimelineLoadingMap[order.id])}
                    >
                      {orderTimelineLoadingMap[order.id] ? 'Cargando bitacora...' : Array.isArray(orderTimelineMap[order.id]) ? 'Ocultar bitacora' : 'Ver bitacora'}
                    </button>
                  </div>
                  {Array.isArray(orderTimelineMap[order.id]) && (
                    <div style={{ marginTop: '0.25rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'grid', gap: '0.35rem' }}>
                      {orderTimelineMap[order.id].length === 0 ? (
                        <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.78rem' }}>Sin eventos registrados.</p>
                      ) : (
                        orderTimelineMap[order.id].map((evt) => (
                          <p key={evt.id} style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.78rem' }}>
                            {evt.timelineType || evt.event} · {evt.happenedAt ? new Date(evt.happenedAt).toLocaleString('es-MX') : 'N/D'}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card glass-card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Operacion de pagos (payout manual)</h2>
          {operationalLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando cola de payouts...</p>
          ) : payoutQueue.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay payouts manuales pendientes.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {payoutQueue.map((order) => (
                <div key={order.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'grid', gap: '0.35rem' }}>
                  <p style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>Orden {order.id}</p>
                  <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.82rem' }}>
                    Cliente: {order.client?.name || 'N/D'} · Profesional: {order.professional?.user?.name || 'N/D'}
                  </p>
                  <p style={{ color: 'var(--secondary)', margin: 0, fontSize: '0.78rem' }}>
                    Estado operativo: {order.state || order.status} · Pago: {order.paymentState || 'N/A'}
                  </p>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {String(order.status || '').toUpperCase() === 'PAYOUT_INICIADO' && (
                      <>
                        <button
                          className="btn btn-primary"
                          onClick={() => handlePayoutSettle(order.id, 'COMPLETE')}
                          disabled={Boolean(payoutActionMap[order.id])}
                        >
                          {payoutActionMap[order.id] === 'COMPLETE' ? 'Aplicando...' : 'Marcar payout completado'}
                        </button>
                        <button
                          className="btn btn-outline"
                          onClick={() => handlePayoutSettle(order.id, 'FAIL')}
                          disabled={Boolean(payoutActionMap[order.id])}
                        >
                          {payoutActionMap[order.id] === 'FAIL' ? 'Aplicando...' : 'Marcar payout fallido'}
                        </button>
                      </>
                    )}
                    {String(order.status || '').toUpperCase() === 'PAYOUT_FALLIDO' && (
                      <button
                        className="btn btn-outline"
                        onClick={() => handlePayoutSettle(order.id, 'RETRY')}
                        disabled={Boolean(payoutActionMap[order.id])}
                      >
                        {payoutActionMap[order.id] === 'RETRY' ? 'Reintentando...' : 'Reintentar payout'}
                      </button>
                    )}
                    <button
                      className="btn btn-outline"
                      onClick={() => handleToggleOrderTimeline(order.id)}
                      disabled={Boolean(orderTimelineLoadingMap[order.id])}
                    >
                      {orderTimelineLoadingMap[order.id] ? 'Cargando bitacora...' : Array.isArray(orderTimelineMap[order.id]) ? 'Ocultar bitacora' : 'Ver bitacora'}
                    </button>
                  </div>
                  {Array.isArray(orderTimelineMap[order.id]) && (
                    <div style={{ marginTop: '0.25rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'grid', gap: '0.35rem' }}>
                      {orderTimelineMap[order.id].length === 0 ? (
                        <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.78rem' }}>Sin eventos registrados.</p>
                      ) : (
                        orderTimelineMap[order.id].map((evt) => (
                          <p key={evt.id} style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: '0.78rem' }}>
                            {evt.timelineType || evt.event} · {evt.happenedAt ? new Date(evt.happenedAt).toLocaleString('es-MX') : 'N/D'}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card admin-section-card">
          <h2 className="admin-section-title" style={{ color: 'var(--primary)' }}>Verificaciones pendientes</h2>
          {operationalLoading ? (
            <p>Cargando documentos...</p>
          ) : operationalError ? (
            <p style={{ color: '#ef4444' }}>{operationalError}</p>
          ) : pendingDocs.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay documentos pendientes.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {pendingDocs.map((doc) => {
                const isApproving = docActionMap[doc.id] === 'approve';
                const isRejecting = docActionMap[doc.id] === 'reject';
                return (
                  <div key={doc.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                    <div>
                      <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem' }}>{doc.professional?.user?.name || 'Profesional'}</p>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>{doc.professional?.user?.email || 'Sin correo'}</p>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>Tipo: {doc.type} · Enviado: {doc.createdAt ? new Date(doc.createdAt).toLocaleString('es-MX') : 'N/D'}</p>
                    </div>
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ width: 'fit-content' }}>
                        Ver documento
                      </a>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleApproveVerificationDoc(doc.id)}
                        disabled={isApproving || isRejecting}
                      >
                        {isApproving ? 'Aprobando...' : 'Aprobar'}
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleRejectVerificationDoc(doc.id)}
                        disabled={isApproving || isRejecting}
                      >
                        {isRejecting ? 'Rechazando...' : 'Rechazar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Control de profesionales destacados</h2>
          {operationalLoading ? (
            <p>Cargando profesionales...</p>
          ) : operationalError ? (
            <p style={{ color: '#ef4444' }}>{operationalError}</p>
          ) : activeProfessionals.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay profesionales activos para mostrar.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem', marginBottom: '1rem' }}>
              {activeProfessionals.map((pro) => (
                <div key={pro.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>{pro.name}</p>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem' }}>
                      {pro.title || 'Profesional verificado'} · {pro.category} · {pro.isFeatured ? 'Destacado' : 'Normal'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--on-surface-variant)', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(pro.isFeatured)}
                        disabled={Boolean(featuredSavingMap[pro.id])}
                        onChange={(e) => handleToggleFeatured(pro, e.target.checked)}
                      />
                      Destacar
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      min="0"
                      max="999"
                      value={pro.featuredRank || 0}
                      disabled={Boolean(featuredSavingMap[pro.id])}
                      onChange={(e) => handleToggleFeatured(pro, Boolean(pro.isFeatured), e.target.value)}
                      style={{ width: '88px', padding: '0.45rem 0.55rem' }}
                      aria-label="Orden destacado"
                    />
                    <button className="btn btn-outline" onClick={() => copyReservationLink(pro.id)}>Copiar link</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Citas y pagos</h2>
          {operationalLoading ? (
            <p>Cargando citas...</p>
          ) : operationalError ? (
            <p style={{ color: '#ef4444' }}>{operationalError}</p>
          ) : sortedAppointments.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay citas proximas para gestionar.</p>
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
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Proveedor: <strong>{appt.videoSession?.provider || (appt.meetingLink ? 'externo' : 'sin definir')}</strong>
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
                    <button
                      className="btn btn-outline"
                      onClick={() => handleAutoGenerateVideo(appt.id)}
                      disabled={!!savingMap[appt.id]}
                    >
                      {savingMap[appt.id] ? 'Generando...' : 'Generar sala automatica'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card glass-card" style={{ padding: '1rem', marginTop: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Moderacion de resenas</h2>
          {operationalLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando resenas...</p>
          ) : reviews.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>No hay resenas publicadas.</p>
          ) : (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              {reviews.map((review) => (
                <div key={review.id} style={{ border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', display: 'grid', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: 'var(--primary)', fontWeight: 800, margin: 0 }}>{review.rating}/5 · {review.professional?.name || 'Profesional'}</p>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8rem', margin: 0 }}>
                        Autor: {review.author?.name || 'Cliente'} · {review.createdAt ? new Date(review.createdAt).toLocaleString('es-MX') : 'N/D'}
                      </p>
                    </div>
                    <button
                      className="btn btn-outline"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={Boolean(reviewDeletingMap[review.id])}
                    >
                      {reviewDeletingMap[review.id] ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                  <p style={{ color: 'var(--on-surface)', margin: 0, lineHeight: 1.5 }}>{review.comment || 'Sin comentario'}</p>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', margin: 0 }}>
                    {review.appointment?.status ? `Cita ${review.appointment.status}` : 'Sin cita vinculada'} · {review.isVerified ? 'Verificada' : 'No verificada'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDeleteUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
        >
          <div className="glass-card" style={{ width: 'min(480px, 100%)', padding: '1rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Confirmar eliminacion</h3>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
              Esta accion eliminara la cuenta de <strong>{confirmDeleteUser.email}</strong>. No se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDeleteUser(null)} disabled={deletingUserId === confirmDeleteUser.id}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                onClick={handleDeleteUser}
                disabled={deletingUserId === confirmDeleteUser.id}
              >
                {deletingUserId === confirmDeleteUser.id ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

