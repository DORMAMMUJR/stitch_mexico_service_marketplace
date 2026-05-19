import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptSensitiveHealthData, setAcceptSensitiveHealthData] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedRole =
    searchParams.get('role') === 'professional' || searchParams.get('intent') === 'publish'
      ? 'PROFESSIONAL'
      : 'CLIENT';
  const intent = searchParams.get('intent');

  const isFormValid =
    name.trim() !== '' &&
    phone.trim() !== '' &&
    email.trim() !== '' &&
    password.trim() !== '' &&
    acceptTerms &&
    acceptPrivacy &&
    acceptSensitiveHealthData;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      setError('Completa los 4 campos y acepta Terminos, Aviso de Privacidad y tratamiento de datos sensibles de salud.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const guestId = localStorage.getItem('guest_id');

      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          role: requestedRole,
          guest_id: guestId,
          acceptedTerms: acceptTerms,
          acceptedPrivacy: acceptPrivacy,
          acceptedSensitiveHealthData: acceptSensitiveHealthData,
          privacyConsentedAt: new Date().toISOString(),
          sensitiveHealthDataConsentedAt: new Date().toISOString(),
        }),
      });

      const loginData = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      login(null, loginData.user);

      const redirectTo = sessionStorage.getItem('redirectTo') || sessionStorage.getItem('returnUrl');
      if (redirectTo) {
        sessionStorage.removeItem('redirectTo');
        sessionStorage.removeItem('returnUrl');
        navigate(redirectTo, { replace: true });
        return;
      }

      if (guestId) {
        localStorage.removeItem('guest_id');
      }

      if (intent === 'publish' || loginData.user?.role === 'PROFESSIONAL') {
        navigate('/verification', { replace: true });
        return;
      }

      navigate('/mis-solicitudes', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(circle at 85% 15%, rgba(16, 185, 129, 0.15), transparent 40%),
          radial-gradient(circle at 10% 80%, rgba(6, 78, 59, 0.2), transparent 45%),
          var(--surface)
        `,
      }}
    >
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

        <div className="card glass-card animate-in stagger-1" style={{ width: '100%', maxWidth: '420px', padding: 'clamp(1.5rem, 5vw, 2.5rem)', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Crea tu cuenta</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Unete al ecosistema de Intecnia</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>error</span>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Ej. Juan Perez"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                placeholder="Ej. +52 55 1234 5678"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo electronico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contrasena</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="********"
                  required
                  minLength="8"
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
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem' }}>Minimo 8 caracteres.</p>
            </div>

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
                    Terminos y Condiciones
                  </Link>{' '}
                  *
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
                  Acepto el{' '}
                  <Link to="/privacy" target="_blank" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>
                    Aviso de Privacidad
                  </Link>{' '}
                  *
                </span>
              </label>

              <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>
                <input
                  type="checkbox"
                  checked={acceptSensitiveHealthData}
                  onChange={(e) => setAcceptSensitiveHealthData(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: 'var(--secondary)', flexShrink: 0, width: '1rem', height: '1rem' }}
                />
                <span>
                  Acepto el tratamiento de datos sensibles de salud y el aviso de privacidad especifico para servicios de salud. *
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem', opacity: !isFormValid ? 0.5 : 1, transition: 'opacity 0.2s' }}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>progress_activity</span>
                  Procesando...
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              Ya tienes una cuenta? <Link to="/login" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Inicia sesion</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
