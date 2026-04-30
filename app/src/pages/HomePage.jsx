import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavbarIntecnia from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

const CATEGORIES = [
  { label: 'Salud y Bienestar', icon: 'psychology', key: 'HEALTH_WELLNESS' },
  { label: 'Legal', icon: 'gavel', key: 'LEGAL' },
  { label: 'Tecnología', icon: 'computer', key: 'IT_SECURITY' },
  { label: 'Finanzas', icon: 'account_balance', key: 'FINANCE_TAX' },
  { label: 'Ingeniería', icon: 'engineering', key: 'ENGINEERING' },
  { label: 'Hogar', icon: 'home_repair_service', key: 'GENERAL_MAINTENANCE' },
];

function ProfessionalSkeleton() {
  return (
    <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', padding: '1.5rem', background: 'var(--surface-container-lowest)', animation: 'pulse 1.5s ease-in-out infinite' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--surface-container)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '1rem', background: 'var(--surface-container)', borderRadius: '4px', marginBottom: '0.5rem', width: '60%' }} />
          <div style={{ height: '0.75rem', background: 'var(--surface-container)', borderRadius: '4px', width: '40%' }} />
        </div>
      </div>
      <div style={{ height: '0.75rem', background: 'var(--surface-container)', borderRadius: '4px', marginBottom: '0.5rem' }} />
      <div style={{ height: '0.75rem', background: 'var(--surface-container)', borderRadius: '4px', width: '80%' }} />
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/directory?q=${encodeURIComponent(searchQuery)}` : '/directory');
  };

  useEffect(() => {
    fetch('/api/professionals?limit=4')
      .then(r => r.ok ? r.json() : [])
      .then(data => setFeatured(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => setFeatured([]))
      .finally(() => setLoadingFeatured(false));
  }, []);

  return (
    <>
      <NavbarIntecnia activePage="marketplace" />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="hero-gradient" style={{ padding: '6rem 1.5rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <p className="text-label-md animate-in stagger-1" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--primary-fixed-dim)', marginBottom: '1.25rem' }}>
          PLATAFORMA VERIFICADA · CDMX
        </p>
        <h1 className="animate-in stagger-2" style={{ fontFamily: 'Manrope', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '750px', margin: '0 auto 1.25rem', color: 'var(--on-primary)' }}>
          Encuentra y agenda profesionales<br />sin riesgos ni fraudes
        </h1>
        <p className="animate-in stagger-3" style={{ fontSize: '1.0625rem', color: 'var(--primary-fixed-dim)', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Nuestro asistente agenda tu cita por ti con especialistas verificados cerca de ti.
        </p>

        <form onSubmit={handleSearch} className="hero-search-container animate-in stagger-4" style={{ maxWidth: '640px', margin: '0 auto 1.25rem', borderRadius: 'var(--radius-xl)', padding: '0.375rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, padding: '0 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>search</span>
            <input
              type="text"
              placeholder="Psicóloga, Abogado, Plomero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '0.875rem 0', fontSize: '0.9375rem', color: 'var(--on-surface)', background: 'transparent', border: 'none', outline: 'none' }}
              id="hero-search"
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--secondary)' }}>location_on</span>
              CDMX
            </span>
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', padding: '0.75rem 1.75rem', fontWeight: 600 }}>
            BUSCAR
          </button>
        </form>

        {/* Micro-confianza */}
        <div className="animate-in stagger-5" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {['✔️ Profesionales verificados', '⭐ Calificaciones reales', '🤖 Agenda automática en minutos'].map(chip => (
            <span key={chip} style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--on-primary)', fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.15)' }}>
              {chip}
            </span>
          ))}
        </div>

        {/* Botones secundarios */}
        <div className="animate-in stagger-5" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/directory" className="btn btn-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
            Buscar servicios
          </Link>
          <Link to="/register" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--on-primary)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_business</span>
            Publicar mi servicio gratis
          </Link>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ──────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface-container-lowest)', borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0', padding: '0' }}>
          {[
            { value: '4.8 / 5', label: 'Calificación Promedio', icon: 'star' },
            { value: '+50', label: 'Profesionales Verificados', icon: 'verified_user' },
            { value: '+200', label: 'Citas Agendadas', icon: 'calendar_month' },
            { value: 'CDMX', label: 'Disponibles en tu ciudad', icon: 'location_on' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ padding: '1.75rem 1.5rem', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--outline-variant)' : 'none' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '22px', color: 'var(--secondary)', marginBottom: '0.25rem', display: 'block' }}>{stat.icon}</span>
              <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.375rem', color: 'var(--primary)', marginBottom: '0.125rem' }}>{stat.value}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CÓMO TE AYUDAMOS (NUEVA) ────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>TU ASISTENTE INTELIGENTE</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>¿Cómo te ayudamos?</h2>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: '480px', margin: '0 auto' }}>Sin llamadas, sin esperas. Tu asistente trabaja por ti.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            {[
              { icon: 'smart_toy', color: '#6366f1', label: 'Te ayuda a encontrar opciones', desc: 'Dile qué necesitas y el asistente busca al profesional ideal para ti.' },
              { icon: 'calendar_month', color: 'var(--secondary)', label: 'Agenda por ti', desc: 'Elige el horario disponible y confirmamos tu cita automáticamente.' },
              { icon: 'notifications_active', color: '#f59e0b', label: 'Notifica al profesional', desc: 'El especialista recibe un aviso al instante y se prepara para atenderte.' },
            ].map(item => (
              <div key={item.label} className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: '28px', color: item.color }}>{item.icon}</span>
                </div>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{item.label}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-lowest)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>PROCESO SIMPLE</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>3 pasos, una cita confirmada</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { num: '1', icon: 'search', title: 'Busca', text: 'Explora por categoría o cuéntale al asistente lo que necesitas.' },
              { num: '2', icon: 'person_check', title: 'Elige al profesional', text: 'Ve su perfil verificado, calificaciones reales y disponibilidad.' },
              { num: '3', icon: 'calendar_month', title: 'Agenda automáticamente', text: 'Nuestro asistente te ayuda a agendar tu cita en minutos y notifica al profesional por ti.' },
            ].map(step => (
              <div key={step.num} className="how-step animate-in">
                <div className="how-step-number">{step.num}</div>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'block' }}>{step.icon}</span>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORÍAS ────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Explora por categoría</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Elige el tipo de servicio que necesitas.</p>
            </div>
            <Link to="/directory" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              VER TODOS <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {CATEGORIES.map(cat => (
              <Link key={cat.key} to={`/directory?category=${cat.key}`} className="cat-card" style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.75rem 1rem', textAlign: 'center', gap: '0.75rem' }}>
                <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)' }}>
                  <span className="material-symbols-outlined">{cat.icon}</span>
                </div>
                <span style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--primary)' }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROFESIONALES DESTACADOS ──────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-lowest)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>VERIFICADOS</p>
              <h2 className="text-headline-md" style={{ color: 'var(--primary)' }}>Profesionales Destacados</h2>
            </div>
            <Link to="/directory" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              VER DIRECTORIO <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
            </Link>
          </div>

          {loadingFeatured ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {[1, 2, 3, 4].map(i => <ProfessionalSkeleton key={i} />)}
            </div>
          ) : featured.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem', display: 'block' }}>rocket_launch</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Estamos creciendo 🚀</h3>
              <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Sé de los primeros en publicar tu servicio y llega a cientos de clientes.</p>
              <Link to="/register" className="btn btn-primary">Publicar mi servicio gratis</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {featured.map(pro => (
                <Link key={pro.id} to={`/profile/${pro.id}`} className="card" style={{ textDecoration: 'none', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {pro.user?.avatarUrl ? (
                      <img src={pro.user.avatarUrl} alt={pro.user?.name} style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>person</span>
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)', marginBottom: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pro.user?.name || 'Profesional'}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pro.title || pro.category}</p>
                    </div>
                  </div>
                  {pro.rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px', color: '#f59e0b' }}>star</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>{Number(pro.rating).toFixed(1)}</span>
                    </div>
                  )}
                  <span className="btn btn-outline" style={{ fontSize: '0.8125rem', textAlign: 'center', justifyContent: 'center' }}>Ver Perfil</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── TESTIMONIOS ───────────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-low)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>TESTIMONIOS</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)' }}>Lo que dicen nuestros usuarios</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { name: 'María González', role: 'Directora de RRHH', text: 'El asistente me agendó una cita con un consultor fiscal en menos de 5 minutos. Increíblemente fácil.', stars: 5 },
              { name: 'Carlos Mendoza', role: 'CEO, TechStartup MX', text: 'La verificación de perfiles me dio total confianza. Ya no más fraudes ni gente que no cumple.', stars: 5 },
              { name: 'Ana Ramírez', role: 'Emprendedora', text: 'Encontré a mi psicóloga aquí. El bot me ayudó a agendar mi primera cita en minutos. ¡Funciona de verdad!', stars: 5 },
            ].map(t => (
              <div key={t.name} className="testimonial-card">
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#f59e0b' }}>star</span>
                  ))}
                </div>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{t.text}"</p>
                <div>
                  <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)' }}>{t.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 1.5rem', background: 'var(--primary)', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem', display: 'block' }}>rocket_launch</span>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--on-primary)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Empieza ahora — es gratis
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.75)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Empieza gratis, sin complicaciones. Profesionales verificados listos para atenderte.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <Link to="/directory" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              Buscar servicios
            </Link>
            <Link to="/register" className="btn" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--on-primary)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_business</span>
              Publicar mi servicio
            </Link>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
            ¿Tienes dudas?{' '}
            <button onClick={() => navigate('/directory')} style={{ background: 'none', border: 'none', color: '#4ade80', textDecoration: 'none', fontWeight: 600, cursor: 'pointer', padding: 0, font: 'inherit' }}>
              Encuentra un especialista
            </button>
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
