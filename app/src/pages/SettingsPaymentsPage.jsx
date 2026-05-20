import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useAuth } from '../hooks/useAuth';

export function SettingsPaymentsPage() {
  const { user } = useAuth();
  const isProfessional = user?.role === 'PROFESSIONAL';

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ payoutsEnabled: true, platformManaged: true });

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
            payoutsEnabled: Boolean(data?.payoutsEnabled ?? true),
            platformManaged: Boolean(data?.platformManaged ?? true),
          });
        }
      } catch {
        if (!cancelled) setStatus({ payoutsEnabled: true, platformManaged: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [isProfessional]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <NavbarIntecnia activePage="dashboard" />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem 3rem' }}>
        <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>AJUSTES</p>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Pagos y depositos</h1>
        </div>

        {!isProfessional ? (
          <div className="card glass-card" style={{ padding: '1rem' }}>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Esta seccion esta disponible para cuentas profesionales.</p>
            <Link to="/dashboard" className="btn btn-primary">Volver al dashboard</Link>
          </div>
        ) : loading ? (
          <div className="card glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--on-surface-variant)' }}>Cargando estado de pagos...</p>
          </div>
        ) : (
          <div className="card glass-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Cobros centralizados por administracion</h2>
              {(status.payoutsEnabled && status.platformManaged) ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', borderRadius: '9999px', padding: '0.35rem 0.7rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                  Activo
                  <span>{'\u2713'}</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface-container-low)', color: 'var(--on-surface)', borderRadius: '9999px', padding: '0.35rem 0.7rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                  En revision
                </span>
              )}
            </div>

            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', marginBottom: 0 }}>
              Todos los pagos de clientes se concentran en la cuenta principal de la plataforma. La liquidacion al profesional se realiza manualmente por administracion.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
