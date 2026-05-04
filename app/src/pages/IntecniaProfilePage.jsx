import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { NotifBanner } from '../components/NotifBanner';
import { ChatWidget } from '../components/ChatWidget';
import { AvailabilitySelector } from '../components/AvailabilitySelector';
import { useProfile } from '../hooks/useProfile';
import { useReviews } from '../hooks/useReviews';
import { useAvailability } from '../hooks/useAvailability';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function IntecniaProfilePage() {
  const { id } = useParams();
  const { data: profile, isLoading, error } = useProfile(id);
  const { data: dbReviews } = useReviews(id);
  const { data: availability } = useAvailability(id);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const chatRef = useRef(null);

  const scrollToChat = () => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  // ── Estados de carga y error ────────────────────────────────────────────────
  if (isLoading) return (
    <>
      <NavbarIntecnia />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', display: 'block', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'Manrope', fontWeight: 500 }}>Cargando perfil...</p>
        </div>
      </div>
      <Footer />
    </>
  );

  if (error || !profile) return (
    <>
      <NavbarIntecnia />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '420px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--on-surface-variant)', marginBottom: '1rem', display: 'block' }}>person_off</span>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Perfil no encontrado</h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>Este profesional no existe o su perfil no está disponible en este momento.</p>
          <a href="/directory" className="btn btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>Ver otros profesionales</a>
        </div>
      </div>
      <Footer />
    </>
  );

  // Usar los datos reales del backend directamente
  const prof = profile;

  // Reseñas dinámicas — sin datos estáticos de respaldo

  const reviews = (dbReviews && dbReviews.length > 0)
    ? dbReviews.map(r => ({
        name: r.name,
        date: new Date(r.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
        rating: r.rating,
        comment: r.comment,
      }))
    : []; // Sin reseñas de respaldo hardcodeadas

  // Función helper para formatear fecha relativa
  const formatRelativeDate = (dateStr) => {
    if (typeof dateStr === 'string' && dateStr.startsWith('Hace')) return dateStr;
    return dateStr;
  };

  return (
    <>
      <NavbarIntecnia />

      <div className="container layout-profile">
        {/* Left Column */}
        <div>
          {/* ── Header Card: Foto → Nombre → Título → Rating → Precio → Bio ── */}
          <div className="card animate-in stagger-1" style={{ padding: '2rem', marginBottom: '1.5rem' }}>

            {/* Fila superior: foto + info esencial */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {/* Foto */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={prof.avatarUrl}
                  alt={prof.name}
                  style={{ width: '7rem', height: '7rem', borderRadius: 'var(--radius-xl)', objectFit: 'cover', boxShadow: 'var(--ambient-shadow)' }}
                />
                {prof.isVerified && (
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--surface-container-lowest)', padding: '3px', borderRadius: '50%', border: '3px solid var(--surface-container-lowest)' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified</span>
                  </div>
                )}
              </div>

              {/* Info principal */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                {/* Nombre */}
                <h1 style={{ fontFamily: 'Manrope', fontSize: '1.625rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.125rem' }}>{prof.name}</h1>

                {/* Título */}
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '0.625rem' }}>{prof.title}</p>

                {/* Rating + n° reseñas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#f59e0b' }}>star</span>
                  <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9375rem' }}>{prof.rating || '—'}</span>
                  <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>({prof.reviewCount || reviews.length} reseñas)</span>
                </div>

                {/* Precio */}
                {prof.hourlyRate && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '0.75rem' }}>
                    Desde ${Number(prof.hourlyRate).toLocaleString('es-MX')} {prof.currency || 'MXN'} / hora
                  </p>
                )}

                {/* Chips de verificación y categoría */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {prof.category && (
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', background: 'var(--surface-container)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface)', border: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>category</span>
                      {prof.category.replace(/_/g, ' ')}
                    </span>
                  )}
                  {prof.biometricDone && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>fingerprint</span> BIOMETRÍA</span>}
                  {prof.satVerifiedAt && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '13px' }}>account_balance</span> SAT</span>}
                  {prof.isVerified && <span className="badge badge-green"><span className="material-symbols-outlined icon-filled" style={{ fontSize: '13px' }}>verified</span> CERTIFICADA</span>}
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={scrollToChat} className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>forum</span> Ir al chat
                  </button>
                  {prof.phone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span>
                      {prof.phone}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>lock</span>
                      Contacto al fondear la orden
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1.25rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: '0.625rem' }}>Sobre Mí</h2>
              <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.75, fontSize: '0.9375rem' }}>{prof.bio}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid-4" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--outline-variant)' }}>
              {[
                { val: prof.yearsExp, label: 'AÑOS EXP.' },
                { val: prof.projectsCount, label: 'PROYECTOS' },
                { val: prof.successRate, label: 'ÉXITO' },
                { val: prof.rating, label: '★ RATING' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: 'Manrope', fontSize: '1.375rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.val}</p>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontSize: '0.6875rem' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reseñas */}
          <div className="card animate-in stagger-2" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>Reseñas Recientes</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#f59e0b' }}>star</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9375rem' }}>{prof.rating || '—'}</span>
                <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>({prof.reviewCount || reviews.length} reseñas)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.length > 0 ? (
                reviews.map((r, i) => (
                  <div key={i} className="review-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>person</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary)' }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{formatRelativeDate(r.date)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '0.5rem' }}>
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <span key={j} className="material-symbols-outlined icon-filled" style={{ fontSize: '14px', color: '#f59e0b' }}>star</span>
                      ))}
                    </div>
                    <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>{r.comment}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--outline-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>chat_bubble</span>
                  <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Sin reseñas aún</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Este profesional aún no tiene reseñas públicas.</p>
                </div>
              )}
            </div>
          </div>
          {/* Portafolio */}
          <div className="card animate-in stagger-4" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Portafolio y Experiencia</h2>
            {prof.portfolioItems && prof.portfolioItems.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {prof.portfolioItems.map(item => (
                  <div key={item.id} style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '1', border: '1px solid var(--outline-variant)' }}>
                    <img src={item.imageUrl} alt="Trabajo del profesional" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--outline-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>photo_library</span>
                <p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-surface)', marginBottom: '0.375rem' }}>Portafolio en construcción</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Este profesional aún no ha subido ejemplos de su trabajo.</p>
              </div>
            )}
          </div>

          {/* Paquetes y Servicios — precios reales del backend */}
          <div className="card animate-in stagger-5" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Paquetes y Tarifas</h2>
            {prof.hourlyRate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  {
                    name: 'Consulta Inicial (1h)',
                    price: prof.hourlyRate,
                    desc: `Una hora de atención directa con ${prof.name?.split(' ')[0] || 'el profesional'}. Ideal para conocerse y definir el plan de trabajo.`,
                    popular: false,
                  },
                  {
                    name: 'Sesión Extendida (2h)',
                    price: Math.round(prof.hourlyRate * 1.8),
                    desc: 'Dos horas continuas con un descuento aplicado. Perfecto para proyectos que requieren mayor profundidad.',
                    popular: true,
                  },
                  {
                    name: 'Paquete Mensual (4 sesiones)',
                    price: Math.round(prof.hourlyRate * 4 * 0.85),
                    desc: 'Cuatro sesiones de una hora al mes. Seguimiento constante con la mejor tarifa disponible.',
                    popular: false,
                  },
                ].map((pkg) => (
                  <div key={pkg.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', border: pkg.popular ? '2px solid var(--secondary)' : 'var(--glass-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)' }}>{pkg.name}</h4>
                        {pkg.popular && <span style={{ fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--secondary)', color: 'var(--on-secondary)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)' }}>POPULAR</span>}
                      </div>
                      <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>{pkg.desc}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--secondary)' }}>
                        ${pkg.price.toLocaleString('es-MX')} {prof.currency || 'MXN'}
                      </p>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>por sesión</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--outline-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>payments</span>
                <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Este profesional aún no ha configurado sus tarifas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Appointment & AI Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="animate-in stagger-2" onClickCapture={(e) => {
            if (!isAuthenticated) {
              e.stopPropagation();
              e.preventDefault();
              sessionStorage.setItem('returnUrl', window.location.pathname);
              navigate('/login');
            }
          }}>
            <AvailabilitySelector professionalId={id} availability={availability} />
          </div>
          
          <div ref={chatRef} className="animate-in stagger-3" onClickCapture={(e) => {
            if (!isAuthenticated) {
              e.stopPropagation();
              e.preventDefault();
              sessionStorage.setItem('returnUrl', window.location.pathname);
              navigate('/login');
            }
          }}>
            <ChatWidget professionalName={prof.name} professionalId={prof.userId} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
