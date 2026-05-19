import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContext';
import { apiFetch } from '../lib/api';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const googleEnabled = Boolean(String(import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '').trim());

  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthStatus = params.get('oauth');
    if (!oauthStatus) return;

    const completeGoogleLogin = async () => {
      if (oauthStatus !== 'success') {
        const reason = params.get('reason') || 'oauth_error';
        setError(`No se pudo completar el acceso con Google (${reason}).`);
        return;
      }

      try {
        const meData = await apiFetch('/auth/me');
        if (!meData?.user) {
          throw new Error('No se pudo recuperar la sesion de Google.');
        }

        login(null, meData.user);
        const redirect = params.get('redirect');
        if (redirect) {
          navigate(redirect, { replace: true });
          return;
        }

        const role = meData.user?.role;
        if (role === 'PROFESSIONAL') navigate('/dashboard', { replace: true });
        else if (role === 'CLIENT') navigate('/mis-solicitudes', { replace: true });
        else if (role === 'ADMIN') navigate('/admin', { replace: true });
        else navigate('/', { replace: true });
      } catch (err) {
        setError(err.message || 'No se pudo completar el acceso con Google.');
      }
    };

    completeGoogleLogin();
  }, [location.search, login, navigate]);
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Por favor, ingresa tu correo electronico para recuperar la contrasena.', 'info');
      return;
    }

    try {
      showToast(`Enviando solicitud para ${email}...`, 'info');
      await apiFetch('/auth/reset-password-request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showToast(`Se ha enviado un enlace de recuperacion a ${email}`, 'success');
    } catch (err) {
      showToast('Hubo un error al procesar tu solicitud', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      login(null, data.user);

      const redirectTo = sessionStorage.getItem('redirectTo') || sessionStorage.getItem('returnUrl');
      if (redirectTo) {
        sessionStorage.removeItem('redirectTo');
        sessionStorage.removeItem('returnUrl');
        navigate(redirectTo, { replace: true });
        return;
      }

      const role = data.user?.role;
      if (role === 'PROFESSIONAL') navigate('/dashboard', { replace: true });
      else if (role === 'CLIENT') navigate('/mis-solicitudes', { replace: true });
      else if (role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setError('Google no devolvio credencial valida.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const data = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      });

      login(null, data.user);
      const role = data.user?.role;
      if (role === 'PROFESSIONAL') navigate('/dashboard', { replace: true });
      else if (role === 'CLIENT') navigate('/mis-solicitudes', { replace: true });
      else if (role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Fallo en la autenticacion con Google');
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
          radial-gradient(circle at 12% 22%, rgba(16, 185, 129, 0.14), transparent 38%),
          radial-gradient(circle at 88% 78%, rgba(6, 78, 59, 0.2), transparent 40%),
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'var(--primary-fixed)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>

        <div className="card glass-card animate-in stagger-1" style={{ width: '100%', maxWidth: '420px', padding: 'clamp(1.25rem, 4vw, 2rem)', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Bienvenido de nuevo</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Ingresa tus credenciales para continuar</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>error</span>
              <p style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electronico</label>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contrasena</label>
                <a href="#" onClick={handleForgotPassword} style={{ fontSize: '0.8125rem', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500, cursor: 'pointer' }}>Olvidaste tu contrasena?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="********"
                  required
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
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>progress_activity</span>
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesion'
              )}
            </button>
            {googleEnabled && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('El popup de Google fallo o fue cerrado.')}
                />
              </div>
            )}
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              No tienes cuenta? <Link to="/register" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Crea una gratis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

