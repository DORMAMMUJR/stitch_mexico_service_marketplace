import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';

const defaultStats = {
  totalUsers: 0,
  verifiedProfessionals: 0,
  totalOrders: 0,
  completedRevenue: 0,
  pendingPaymentAppointments: 0,
  activeDisputes: 0,
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
  const [appointments, setAppointments] = useState([]);
  const [activeProfessionals, setActiveProfessionals] = useState([]);
  const [operators, setOperators] = useState([]);
  const [creatingOperator, setCreatingOperator] = useState(false);
  const [operatorForm, setOperatorForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [supportLink, setSupportLink] = useState(localStorage.getItem('platform_support_link') || 'https://wa.me/');
  const [linkDrafts, setLinkDrafts] = useState({});
  const [savingMap, setSavingMap] = useState({});

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

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadOperationalData = async () => {
    try {
      setLoading(true);
      const [docsRes, disputesRes, apptRes, prosRes, opsRes] = await Promise.all([
        fetch('/api/admin/verifications/pending', { credentials: 'include' }),
        fetch('/api/orders/admin/disputes', { credentials: 'include' }),
        fetch('/api/admin/appointments/upcoming', { credentials: 'include' }),
        fetch('/api/admin/professionals/active', { credentials: 'include' }),
        fetch('/api/admin/operators', { credentials: 'include' }),
      ]);

      if (docsRes.status === 401 || docsRes.status === 403) {
        navigate('/');
        return;
      }

      const docsData = await docsRes.json().catch(() => []);
      const disputesData = disputesRes.ok ? await disputesRes.json().catch(() => []) : [];
      const apptData = apptRes.ok ? await apptRes.json().catch(() => []) : [];
      const prosData = prosRes.ok ? await prosRes.json().catch(() => []) : [];
      const opsData = opsRes.ok ? await opsRes.json().catch(() => []) : [];

      setPendingDocs(Array.isArray(docsData) ? docsData : []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);
      setAppointments(Array.isArray(apptData) ? apptData : []);
      setActiveProfessionals(Array.isArray(prosData) ? prosData : []);
      setOperators(Array.isArray(opsData) ? opsData : []);

      const draftSeed = {};
      (Array.isArray(apptData) ? apptData : []).forEach((a) => {
        draftSeed[a.id] = a.meetingLink || '';
      });
      setLinkDrafts(draftSeed);
    } catch {
      showToast('No se pudieron cargar los datos de administracion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError('');
      const res = await fetch('/api/admin/stats', { credentials: 'include' });

      if (res.status === 401 || res.status === 403) {
        navigate('/');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar el resumen general');
      }

      setStats({
        totalUsers: Number(data.totalUsers || 0),
        verifiedProfessionals: Number(data.verifiedProfessionals || 0),
        totalOrders: Number(data.totalOrders || 0),
        completedRevenue: Number(data.completedRevenue || 0),
        pendingPaymentAppointments: Number(data.pendingPaymentAppointments || data.appointments?.pendingPayment || 0),
        activeDisputes: Number(data.activeDisputes || data.disputes?.active || 0),
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
      const res = await fetch(`/api/admin/users?page=${page}&limit=${usersPagination.limit}&search=${encodedQuery}`, {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        navigate('/');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la lista de usuarios');
      }

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
      const res = await fetch(`/api/admin/appointments/${appointmentId}/meeting-link`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingLink: link }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el link');

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
      const res = await fetch(`/api/appointments/${appointmentId}/video-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAuto: true, provider: 'jitsi' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo generar sala automatica');

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
      const res = await fetch('/api/admin/operators', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el operador');

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
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el rol');
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
      const res = await fetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el usuario');

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

  const statsCards = [
    { key: 'users', label: 'Usuarios Totales', value: stats.totalUsers },
    { key: 'verified', label: 'Profesionales Verificados', value: stats.verifiedProfessionals },
    { key: 'orders', label: 'Ordenes Totales', value: stats.totalOrders },
    { key: 'pending-payment', label: 'Citas Pendientes de Pago', value: stats.pendingPaymentAppointments },
    { key: 'disputes', label: 'Disputas Activas', value: stats.activeDisputes },
    {
      key: 'revenue',
      label: 'Ingresos en Ordenes Completadas',
      value: `$${stats.completedRevenue.toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN`,
    },
  ];

  return (
    <>
      <NavbarIntecnia />
      <div className="container" style={{ padding: '3rem 1rem', minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'Manrope', color: 'var(--primary)', marginBottom: '0.75rem', fontSize: '2rem', fontWeight: 700 }}>Panel Superadmin</h1>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Control total de plataforma, usuarios y operacion.</p>

        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Resumen General</h2>
          {statsLoading ? (
            <p style={{ color: 'var(--on-surface-variant)' }}>Cargando resumen...</p>
          ) : statsError ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <p style={{ color: '#ef4444' }}>{statsError}</p>
              <button className="btn btn-outline" onClick={loadStats}>Reintentar</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {statsCards.map((card) => (
                <div key={card.key} className="glass-card" style={{ padding: '0.875rem', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>{card.label}</p>
                  <p style={{ color: 'var(--primary)', fontSize: '1.3rem', fontWeight: 800 }}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Gestion de Usuarios</h2>

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

          <div style={{ overflowX: 'auto', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)' }}>
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

        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Link principal de contacto/soporte</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={supportLink} onChange={(e) => setSupportLink(e.target.value)} className="input-field" placeholder="https://wa.me/521..." style={{ flex: 1, minWidth: '260px' }} />
            <button className="btn btn-primary" onClick={saveSupportLink}>Guardar link</button>
          </div>
        </div>

        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>Gestion de operadores ADMIN</h2>
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

        <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Resumen rapido</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.75rem' }}>
              <p style={{ color: 'var(--on-surface-variant)' }}>Verificaciones pendientes: <strong>{pendingDocs.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Disputas activas: <strong>{disputes.length}</strong></p>
              <p style={{ color: 'var(--on-surface-variant)' }}>Citas proximas: <strong>{appointments.length}</strong></p>
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

