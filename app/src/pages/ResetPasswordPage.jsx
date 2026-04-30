import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | 'loading'
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      setStatus({ type: 'error', message: 'Enlace de recuperación inválido o ausente.' });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setStatus({ type: 'error', message: 'Las contraseñas no coinciden' });
    }
    if (password.length < 6) {
      return setStatus({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    setStatus({ type: 'loading', message: '' });

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: data.message || 'Contraseña actualizada exitosamente. Redirigiendo...' });
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Error al actualizar la contraseña' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Error de conexión. Intenta nuevamente.' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Header Minimalista */}
      <header className="nav-top">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '4rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: 'var(--secondary)' }}>hub</span>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intecnia</span>
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20%', right: '15%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '15%', left: '15%', width: '300px', height: '300px', background: 'var(--primary-fixed)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>

        <div className="card animate-in stagger-1" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', zIndex: 1, backdropFilter: 'blur(16px)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '3rem', height: '3rem', background: 'var(--secondary-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>lock_reset</span>
            </div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Nueva Contraseña</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Ingresa tu nueva contraseña para recuperar el acceso.</p>
          </div>

          {!isValidToken ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error)', marginBottom: '1rem' }}>error</span>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>{status.message}</p>
              <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Volver al Login</Link>
            </div>
          ) : status.type === 'success' ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem' }}>check_circle</span>
              <p style={{ color: 'var(--on-surface)', fontWeight: 600, marginBottom: '0.5rem' }}>{status.message}</p>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Serás redirigido en breve...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {status.type === 'error' && (
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626', marginTop: '0.125rem' }}>error</span>
                  <p style={{ fontSize: '0.8125rem', color: '#dc2626', lineHeight: 1.5 }}>{status.message}</p>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nueva Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: '20px', zIndex: 2 }}>lock</span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.875rem 2.5rem 0.875rem 2.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s', position: 'relative', zIndex: 1 }}
                    placeholder="••••••••"
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: 0, zIndex: 2 }}
                    tabIndex="-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmar Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: '20px', zIndex: 2 }}>lock</span>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '0.875rem 2.5rem 0.875rem 2.75rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s', position: 'relative', zIndex: 1 }}
                    placeholder="••••••••"
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: 0, zIndex: 2 }}
                    tabIndex="-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={status.type === 'loading'} 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                {status.type === 'loading' ? (
                  <>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>progress_activity</span>
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
