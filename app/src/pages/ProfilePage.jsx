import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { NavbarKonectia } from '../components/NavbarKonectia';
import { Footer } from '../components/Footer';
import { NotifBanner } from '../components/NotifBanner';
import { useProfile } from '../hooks/useProfile';
import { ChatWidget } from '../components/ChatWidget';


export function ProfilePage() {
  const { id } = useParams();
  const { data: profile, isLoading, error } = useProfile(id);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Manrope' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', borderTop: '4px solid var(--secondary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--on-surface-variant)' }}>Cargando perfil institucional...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Manrope', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error)', marginBottom: '1rem' }}>error</span>
          <h2 style={{ marginBottom: '0.5rem' }}>Perfil no encontrado</h2>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>No pudimos localizar la información del profesional solicitado. Por favor, verifique el ID o regrese al directorio.</p>
          <Link to="/directory" className="btn btn-primary" style={{ textDecoration: 'none' }}>Volver al Directorio</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotifBanner />
      <NavbarKonectia />

      <div className="container" style={{ padding: '2rem 1.5rem 4rem', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Profile Card */}
          <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img src={profile.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=180&fit=crop&crop=face"} alt={profile.name} style={{ width: '9rem', height: '10rem', borderRadius: 'var(--radius-xl)', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h1 style={{ fontFamily: 'Manrope', fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{profile.name}</h1>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '1rem' }}>{profile.title || 'Profesional Certificado'}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {profile.biometricDone && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fingerprint</span> BIOMETRIC VERIFIED</span>}
                  {profile.satVerifiedAt && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>account_balance</span> SAT COMPLIANT</span>}
                </div>
                {profile.isVerified && <span className="badge badge-cyan"><span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>verified</span> CONOCER CERTIFIED</span>}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Sobre Mí</h2>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
              {profile.bio || 'Este profesional aún no ha completado su descripción institucional.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem' }}>
              {[
                { val: profile.yearsExp || '0+', label: 'AÑOS EXP.' },
                { val: profile.projectsCount || '0+', label: 'PROYECTOS' },
                { val: profile.successRate || '0%', label: 'ÉXITO' },
                { val: profile.rating || 'N/A', label: '★ RATING' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.val}</p>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio */}
          <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Portafolio Destacado</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: '200px', cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop" alt="Automatización" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', color: 'var(--on-primary)' }}>
                <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--secondary-container)', fontWeight: 600 }}>MANUFACTURA AUTOMOTRIZ</span>
                <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>Automatización Planta Monterrey</h4>
              </div>
            </div>
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: '200px', cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop" alt="Logística" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', color: 'var(--on-primary)' }}>
                <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--secondary-container)', fontWeight: 600 }}>CADENA DE SUMINISTRO</span>
                <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>Optimización Logística CDMX</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Chat */}
        <ChatWidget professionalName={profile.name} />
      </div>

      <Footer />
    </>
  );
}
