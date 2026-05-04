import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptTerms || !acceptPrivacy) {
      setError('Debes aceptar los Términos de Servicio y el Aviso de Privacidad para continuar.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // 1. Registro (Forzando a que todos entren como CLIENT)
      const guestId = localStorage.getItem('guest_id');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password, role: 'CLIENT', guest_id: guestId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la cuenta');
      }

      // 2. Auto-Login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const loginData = await loginRes.json();

      if (loginRes.ok) {
        login(null, loginData.user); // El token viene en cookie HttpOnly, no en el body
      }

      // 3. Redirección inteligente
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        navigate(returnUrl, { replace: true });
        return;
      }

      if (guestId) {
        localStorage.removeItem('guest_id');
      }

      navigate(loginData.user?.role === 'PROFESSIONAL' ? '/dashboard' : '/mis-solicitudes', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      <header className="nav-top">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: 'var(--secondary)' }}>hub</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intecnia</span>
          </Link>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', right: '20%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: '300px', height: '300px', background: 'var(--primary-fixed)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>

        <div className="card animate-in stagger-1" style={{ width: '100%', maxWidth: '420px', padding: 'clamp(1.5rem, 5vw, 2.5rem)', position: 'relative', zIndex: 1, backdropFilter: 'blur(16px)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Crea tu cuenta</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Únete al ecosistema de Intecnia</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>error</span>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Teléfono (WhatsApp)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                placeholder="Ej. +52 55 1234 5678"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.875rem 2.5rem 0.875rem 1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: 0 }}
                  tabIndex="-1"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem' }}>Mínimo 6 caracteres.</p>
            </div>

            {/* Casillas de aceptación legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)' }}>
              <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--secondary)', flexShrink: 0, width: '1rem', height: '1rem' }}
                />
                <span>
                  Acepto los{' '}
                  <Link to="/terms" target="_blank" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Términos de Servicio
                  </Link>{' '}
                  de Intecnia *
                </span>
              </label>

              <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--secondary)', flexShrink: 0, width: '1rem', height: '1rem' }}
                />
                <span>
                  He leído y acepto el{' '}
                  <Link to="/privacy" target="_blank" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Aviso de Privacidad
                  </Link>{' '}
                  (LFPDPPP) *
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !acceptTerms || !acceptPrivacy}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem', opacity: (!acceptTerms || !acceptPrivacy) ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>progress_activity</span>
                  Procesando...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              ¿Ya tienes una cuenta? <Link to="/login" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
