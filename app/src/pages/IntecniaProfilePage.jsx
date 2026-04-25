import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { NotifBanner } from '../components/NotifBanner';
import { ChatWidget } from '../components/ChatWidget';
import { useProfile } from '../hooks/useProfile';
import { useReviews } from '../hooks/useReviews';

export function IntecniaProfilePage() {
  const { id } = useParams();
  const { data: profile, isLoading, error } = useProfile(id);
  const { data: dbReviews } = useReviews(id);
  const chatRef = useRef(null);

  const scrollToChat = () => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Datos por defecto si no hay ID o si la data no carga
  const prof = profile || {
    name: 'Pamela Osnaya',
    phone: null, // Anti-leakage: null por defecto (solo visible tras escrow)
    title: 'Psicóloga Clínica',
    bio: 'Especialista en terapia de pareja, adolescentes y procesos post-separación. Con más de 10 años de experiencia acompañando a personas y familias en momentos de cambio y crecimiento personal.',
    avatarUrl: '/pamela-real.jpg',
    isVerified: true,
    biometricDone: true,
    satVerifiedAt: true,
    yearsExp: '10+',
    projectsCount: '25+',
    successRate: '98%',
    rating: '4.9',
    reviewCount: 3,
  };

  // Reseñas dinámicas (fallback a datos estáticos si la BD no tiene registros)
  const fallbackReviews = [
    { name: 'Laura M.', date: 'Hace 2 semanas', rating: 5, comment: 'Excelente profesional. Me ayudó muchísimo con mi proceso de duelo post-separación. La recomiendo ampliamente.' },
    { name: 'Carlos R.', date: 'Hace 1 mes', rating: 5, comment: 'Mi hijo adolescente ha mejorado notablemente desde que comenzó las sesiones. Muy agradecido.' },
    { name: 'Patricia G.', date: 'Hace 2 meses', rating: 4, comment: 'Muy profesional y empática. Las sesiones en línea funcionan perfectamente.' },
  ];

  const reviews = (dbReviews && dbReviews.length > 0)
    ? dbReviews.map(r => ({
        name: r.name,
        date: new Date(r.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
        rating: r.rating,
        comment: r.comment,
      }))
    : fallbackReviews;

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
          {/* Profile Card */}
          <div className="card animate-in stagger-1" style={{ padding: '2.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img src={prof.avatarUrl} alt={prof.name} style={{ width: '8rem', height: '9rem', borderRadius: 'var(--radius-xl)', objectFit: 'cover', boxShadow: 'var(--ambient-shadow)' }} />
                <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--surface-container-lowest)', padding: '3px', borderRadius: '50%', border: '3px solid var(--surface-container-lowest)' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{prof.name}</h1>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '1rem' }}>{prof.title}</p>

                {/* ── Teléfono: Anti-Leakage ─────────────────────────────── */}
                {prof.phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--secondary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span>
                    <span style={{ fontWeight: 600 }}>{prof.phone}</span>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginBottom: '1rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                    El contacto directo se habilita al fondear la orden.
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {prof.biometricDone && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fingerprint</span> BIOMETRÍA</span>}
                  {prof.satVerifiedAt && <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>account_balance</span> SAT</span>}
                  {prof.isVerified && <span className="badge badge-green"><span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>verified</span> CERTIFICADA</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button onClick={scrollToChat} className="btn btn-primary">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span> Mensaje Directo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="card animate-in stagger-2" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.25rem' }}>Sobre Mí</h2>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '2rem' }}>{prof.bio}</p>
            <div className="grid-4">
              {[
                { val: prof.yearsExp, label: 'AÑOS EXP.' },
                { val: prof.projectsCount, label: 'PROYECTOS' },
                { val: prof.successRate, label: 'ÉXITO' },
                { val: prof.rating, label: '★ RATING' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: 'Manrope', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.val}</p>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews — Dinámicas desde BD */}
          <div className="card animate-in stagger-3" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>Reseñas Recientes</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '18px', color: '#f59e0b' }}>star</span>
                <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)' }}>{prof.rating}</span>
                <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem' }}>({prof.reviewCount || reviews.length} reseñas)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map((r, i) => (
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
              ))}
            </div>
          </div>
          {/* Portfolio */}
          <div className="card animate-in stagger-4" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Portafolio y Experiencia</h2>
            <div className="grid-2">
              {[
                { img: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=400&h=250&fit=crop', label: 'Terapia de Pareja', sub: '120+ sesiones realizadas' },
                { img: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=250&fit=crop', label: 'Adolescentes', sub: '85+ pacientes atendidos' },
              ].map((p) => (
                <div key={p.label} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative', height: '160px' }}>
                  <img src={p.img} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 30%, transparent)' }}></div>
                  <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', color: '#fff' }}>
                    <p style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary-fixed-dim)', fontWeight: 600 }}>{p.sub}</p>
                    <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', marginTop: '0.125rem' }}>{p.label}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing / Packages */}
          <div className="card animate-in stagger-5" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1.25rem' }}>Paquetes y Servicios</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { name: 'Consulta Inicial', price: '$350 MXN', desc: 'Sesión de 50 min. Diagnóstico y plan de trabajo personalizado.', popular: false },
                { name: 'Paquete Mensual', price: '$1,200 MXN', desc: '4 sesiones al mes. Seguimiento semanal con reportes de avance.', popular: true },
                { name: 'Terapia de Pareja', price: '$500 MXN', desc: 'Sesión de 75 min para parejas. Trabajo en comunicación y conflicto.', popular: false },
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
                    <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--secondary)' }}>{pkg.price}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>por sesión</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Chat */}
        <div ref={chatRef}>
          <ChatWidget professionalName={prof.name} />
        </div>
      </div>

      <Footer />
    </>
  );
}
