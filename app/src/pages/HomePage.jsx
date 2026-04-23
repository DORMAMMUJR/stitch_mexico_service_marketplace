import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/directory?q=${encodeURIComponent(searchQuery)}` : '/directory');
  };

  return (
    <>
      <NavbarIntecnia activePage="marketplace" />

      {/* Hero Section */}
      <section className="hero-gradient" style={{ padding: '6rem 1.5rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <p className="text-label-md animate-in stagger-1" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--primary-fixed-dim)', marginBottom: '1.5rem' }}>
          LA INSTITUCIÓN DIGITAL
        </p>
        <h1 className="animate-in stagger-2" style={{ fontFamily: 'Manrope', fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '750px', margin: '0 auto 1.5rem', color: 'var(--on-primary)' }}>
          ¿Qué profesional buscas hoy?
        </h1>
        <p className="animate-in stagger-3" style={{ fontSize: '1.0625rem', color: 'var(--primary-fixed-dim)', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Conecta con la red más autorizada de México de consultores verificados, expertos legales y especialistas técnicos.
        </p>

        {/* Search Bar - Real Form */}
        <form onSubmit={handleSearch} className="hero-search-container animate-in stagger-4" style={{ maxWidth: '600px', margin: '0 auto', borderRadius: 'var(--radius-xl)', padding: '0.375rem', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, padding: '0 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '22px' }}>search</span>
            <input
              type="text"
              placeholder="Ej. Psicóloga, Abogado Fiscal, Ingeniero..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '0.875rem 0', fontSize: '0.9375rem', color: 'var(--on-surface)', background: 'transparent', border: 'none', outline: 'none' }}
              id="hero-search"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', padding: '0.75rem 1.75rem', fontWeight: 600 }}>
            BUSCAR
          </button>
        </form>
      </section>

      {/* Trust Bar */}
      <div className="trust-bar">
        <span className="trust-item" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', color: 'var(--secondary)' }}>CONFIANZA TOTAL</span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified_user</span>
          Cumplimiento SAT
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>fingerprint</span>
          Seguridad Biométrica
        </span>
        <span className="trust-item">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>shield</span>
          Identidades Verificadas
        </span>
      </div>

      {/* How It Works */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-lowest)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>PROCESO SIMPLE</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>¿Cómo funciona Intecnia?</h2>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: '500px', margin: '0 auto' }}>Encuentra al profesional ideal en 3 simples pasos.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            <div className="how-step animate-in stagger-1">
              <div className="how-step-number">1</div>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'block' }}>search</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Busca</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>Explora nuestro directorio de profesionales verificados por categoría, ubicación o especialidad.</p>
            </div>
            <div className="how-step animate-in stagger-2">
              <div className="how-step-number">2</div>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'block' }}>smart_toy</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Agenda con IA</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>Nuestro asistente inteligente te ayuda a programar una cita directamente desde el perfil del profesional.</p>
            </div>
            <div className="how-step animate-in stagger-3">
              <div className="how-step-number">3</div>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary)', marginBottom: '0.75rem', display: 'block' }}>verified_user</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Paga Seguro</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6 }}>Transacciones protegidas con facturación electrónica y cumplimiento SAT garantizado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Expertise */}
      <section style={{ padding: '5rem 1.5rem' }} className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Explora Especialidades</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>Perfiles altamente validados para proyectos corporativos.</p>
          </div>
          <Link to="/categories" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
            VER TODAS <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.25rem' }}>
          {/* Legal */}
          <div className="cat-card" style={{ gridColumn: 'span 2', padding: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
            <div>
              <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)' }}>
                <span className="material-symbols-outlined icon-filled">gavel</span>
              </div>
              <h3 className="text-headline-md" style={{ color: 'var(--primary)' }}>Legal y Cumplimiento</h3>
              <p style={{ color: 'var(--on-surface-variant)', marginTop: '0.5rem', maxWidth: '400px', fontSize: '0.875rem' }}>Derecho corporativo, auditorías fiscales y regulaciones laborales.</p>
            </div>
            <Link to="/directory" className="btn btn-secondary">Explorar</Link>
          </div>

          {[
            { icon: 'account_balance', title: 'Finanzas e Impuestos', desc: 'Contadores certificados y asesores financieros.' },
            { icon: 'engineering', title: 'Ingeniería', desc: 'Consultores en ingeniería civil, estructural e industrial.' },
            { icon: 'security', title: 'TI y Seguridad', desc: 'Arquitectos de sistemas y auditores de ciberseguridad.' },
            { icon: 'psychology', title: 'Salud y Bienestar', desc: 'Psicólogos, nutriólogos y terapeutas certificados.' },
          ].map((cat, i) => (
            <Link key={cat.title} to="/directory" className="cat-card" style={{ cursor: 'pointer', textDecoration: 'none', display: 'block', padding: '2rem' }}>
              <div className="cat-icon" style={{ background: 'var(--secondary-container)', color: 'var(--secondary)' }}>
                <span className="material-symbols-outlined">{cat.icon}</span>
              </div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--primary)', marginBottom: '0.375rem' }}>{cat.title}</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-low)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="text-label-md" style={{ color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem' }}>TESTIMONIOS</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)' }}>Lo que dicen nuestros clientes</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { name: 'María González', role: 'Directora de RRHH', text: 'Intecnia nos ayudó a encontrar un consultor fiscal que resolvió en semanas lo que llevábamos meses intentando. El proceso fue increíblemente rápido.', stars: 5 },
              { name: 'Carlos Mendoza', role: 'CEO, TechStartup MX', text: 'La verificación biométrica y el cumplimiento SAT me dieron total confianza para contratar. La plataforma es de clase mundial.', stars: 5 },
              { name: 'Ana Ramírez', role: 'Emprendedora', text: 'Encontré a mi psicóloga a través de Intecnia. El chatbot de IA me ayudó a agendar mi primera cita en menos de 2 minutos.', stars: 5 },
            ].map((t) => (
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

      <Footer />
    </>
  );
}
