import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ToastContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Por favor, ingresa tu correo electrónico para recuperar la contraseña.', 'info');
      return;
    }
    
    try {
      showToast(`Enviando solicitud para ${email}...`, 'info');
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (res.ok) {
        showToast(`Se ha enviado un enlace de recuperación a ${email}`, 'success');
      } else {
        throw new Error('No se pudo enviar la solicitud');
      }
    } catch (err) {
      showToast('Hubo un error al procesar tu solicitud', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      login(data.token, data.user);
      
      if (data.user.role === 'PROFESSIONAL') {
        navigate('/dashboard');
      } else if (data.user.role === 'CLIENT') {
        navigate('/mis-solicitudes');
      } else if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (e) => {
    e.preventDefault();
    setIsDemo(true);
    showToast('Iniciando Modo Demostración...', 'info');
    setTimeout(() => {
      login('token-demo', {
        id: 'demo-001',
        name: 'Usuario Demo',
        email: 'demo@intecnia.mx',
        role: 'PROFESSIONAL',
        avatarUrl: null
      });
      showToast('¡Bienvenido al Modo Demostración de Intecnia!', 'success');
      navigate('/dashboard');
      setIsDemo(false);
    }, 800);
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
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '300px', height: '300px', background: 'var(--secondary)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '300px', height: '300px', background: 'var(--primary-fixed)', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>

        <div className="card animate-in stagger-1" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', position: 'relative', zIndex: 1, backdropFilter: 'blur(16px)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
                <a href="#" onClick={handleForgotPassword} style={{ fontSize: '0.8125rem', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500, cursor: 'pointer' }}>¿Olvidaste tu contraseña?</a>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.875rem 1rem', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', color: 'var(--on-surface)', fontSize: '0.9375rem', transition: 'all 0.2s' }}
                placeholder="••••••••"
                required 
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}>
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px' }}>progress_activity</span>
                  Ingresando...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

            {/* Demo Mode divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--outline-variant)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>o accede sin cuenta</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--outline-variant)' }} />
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isDemo}
              className="btn"
              style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '0.9375rem', border: '1.5px solid var(--secondary)', color: 'var(--secondary)', background: 'rgba(45,188,254,0.04)', borderRadius: 'var(--radius-lg)', transition: 'all 0.2s' }}
            >
              {isDemo ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '18px' }}>progress_activity</span>
                  Preparando demo...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>science</span>
                  Entrar en Modo Demostración
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--secondary)', fontWeight: 600, textDecoration: 'none' }}>Crea una gratis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
