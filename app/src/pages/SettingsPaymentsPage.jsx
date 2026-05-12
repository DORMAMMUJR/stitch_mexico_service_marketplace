import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContext';

export function SettingsPaymentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isProfessional = user?.role === 'PROFESSIONAL';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ connected: false, payoutsEnabled: false });

  useEffect(() => {
    if (!isProfessional) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadStatus = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/orders/stripe-connect/status', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setStatus({
            connected: Boolean(data?.connected),
            payoutsEnabled: Boolean(data?.payoutsEnabled),
          });
        }
      } catch {
        if (!cancelled) setStatus({ connected: false, payoutsEnabled: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [isProfessional]);

  const startStripeOnboarding = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/stripe-connect/onboarding', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'No se pudo iniciar la configuración de pagos');
      }
      window.location.href = data.url;
    } catch (err) {
      showToast(err.message || 'Error al iniciar Stripe Connect', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="dashboard" />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem 3rem' }}>
        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>AJUSTES</p>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Pagos y depósitos</h1>
        </div>

        {!isProfessional ? (
          <div className="card glass-card" style={{ padding: '1rem' }}>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Esta sección está disponible para cuentas profesionales.</p>
            <Link to="/dashboard" className="btn btn-primary">Volver al dashboard</Link>
          </div>
        ) : loading ? (
          <div className="card glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--on-surface-variant)' }}>Cargando estado de Stripe...</p>
          </div>
        ) : (
          <div className="card glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Stripe Connect</h2>
              {status.payoutsEnabled ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderRadius: '9999px', padding: '0.35rem 0.7rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                  Pagos activos
                  <span>{'\u2713'}</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface-container-low)', color: 'var(--on-surface)', borderRadius: '9999px', padding: '0.35rem 0.7rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                  Pagos pendientes
                </span>
              )}
            </div>

            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {status.payoutsEnabled
                ? 'Tu cuenta está lista para recibir depósitos de tus servicios.'
                : status.connected
                  ? 'Tu cuenta está conectada, pero aún faltan requisitos para habilitar depósitos.'
                  : 'Conecta Stripe para recibir depósitos automáticos.'}
            </p>

            <button
              type="button"
              onClick={startStripeOnboarding}
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: 'fit-content' }}
            >
              {submitting ? 'Abriendo Stripe...' : status.connected ? 'Completar configuración' : 'Configurar Stripe Connect'}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

