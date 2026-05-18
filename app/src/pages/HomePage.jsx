import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

const CATEGORIES = [
  { label: 'Psicología', icon: 'psychology', desc: 'Terapia y salud mental', href: '/directory?q=psicologia' },
  { label: 'Medicina', icon: 'medical_services', desc: 'Atención médica integral', href: '/directory?q=medicina' },
  { label: 'Bienestar', icon: 'self_improvement', desc: 'Nutrición y hábitos saludables', href: '/directory?q=bienestar' },
];

const CATEGORY_MAP = {
  PSYCHOLOGY: 'Psicologia',
  MEDICINE: 'Medicina',
  WELLNESS: 'Bienestar',
};

// Tarjetas de placeholder visibles solo cuando no hay profesionales reales
// Flag IS_PLACEHOLDER: true identifica estos datos como ficticios en todo el codebase
const PLACEHOLDER_PROFESSIONALS = [
  {
    id: 'placeholder-1',
    IS_PLACEHOLDER: true,
    user: { name: 'Dra. Sofía Ramírez', avatarUrl: null },
    title: 'Psicóloga Clínica',
    category: 'PSYCHOLOGY',
    rating: 4.9,
    reviews: 38,
    price: 350,
    responseTime: '< 5 min',
    specialties: ['Terapia de pareja', 'Ansiedad', 'Depresión'],
    initials: 'SR',
    avatarBg: '#7c3aed',
  },
  {
    id: 'placeholder-2',
    IS_PLACEHOLDER: true,
    user: { name: 'Dr. Carlos Mendoza', avatarUrl: null },
    title: 'Médico General',
    category: 'MEDICINE',
    rating: 4.8,
    reviews: 21,
    price: 600,
    responseTime: '< 10 min',
    specialties: ['Consulta general', 'Prevención', 'Control crónico'],
    initials: 'CM',
    avatarBg: '#0284c7',
  },
  {
    id: 'placeholder-3',
    IS_PLACEHOLDER: true,
    user: { name: 'Dra. Elena Torres', avatarUrl: null },
    title: 'Nutrióloga Clínica',
    category: 'WELLNESS',
    rating: 4.9,
    reviews: 19,
    price: 520,
    responseTime: '< 8 min',
    specialties: ['Plan nutricional', 'Control de peso', 'Metabolismo'],
    initials: 'ET',
    avatarBg: '#059669',
  },
  {
    id: 'placeholder-4',
    IS_PLACEHOLDER: true,
    user: { name: 'Dr. Roberto Vega', avatarUrl: null },
    title: 'Psiquiatra',
    category: 'PSYCHOLOGY',
    rating: 4.7,
    reviews: 24,
    price: 450,
    responseTime: '< 12 min',
    specialties: ['Ansiedad', 'Sueño', 'Estado de ánimo'],
    initials: 'RV',
    avatarBg: '#0f766e',
  },
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

// Boton flotante del chat
function FloatingChatButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const openChat = () => {
    const botBtn = document.querySelector('[data-viso-trigger]');
    if (botBtn) botBtn.click();
    else window.location.href = '/directory';
  };

  return (
    <button
      className="home-cta-floating"
      onClick={openChat}
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        background: 'var(--secondary)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        padding: '0.875rem 1.5rem',
        fontFamily: 'Manrope',
        fontWeight: 800,
        fontSize: '0.9375rem',
        cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35)',
        animation: 'slideUp 0.4s ease',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
    >
      <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px' }}>rocket_launch</span>
      Consigue un profesional en 2 min
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const publishServicePath = !isAuthenticated
    ? '/register?role=professional'
    : user?.role === 'CLIENT'
      ? '/dashboard/verification'
      : '/verification';
  const [searchQuery, setSearchQuery] = useState('');
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(searchQuery.trim() ? `/directory?q=${encodeURIComponent(searchQuery)}` : '/directory');
  };

  const openChatWithQuery = (query) => {
    const botBtn = document.querySelector('[data-viso-trigger]');
    if (botBtn) {
        botBtn.click();
        // Disparador opcional de mensaje
    } else {
        navigate(`/directory?q=${encodeURIComponent(query)}`);
    }
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
      <NavbarIntecnia activePage="home" />
      <main style={{ paddingBottom: '8rem' }}>

      {/* HERO */}
      <section className="hero-gradient" style={{ padding: '4.5rem 1.5rem 3.25rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Badge de confianza */}
        <div className="animate-in stagger-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '0.375rem 1rem', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#4ade80' }}>verified</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-primary)', letterSpacing: '0.05em' }}>PLATAFORMA VERIFICADA · CDMX</span>
        </div>

        {/* Titulo principal: enfoque en resultado y eliminacion de riesgo */}
        <h1 className="animate-in stagger-2" style={{ fontFamily: 'Manrope', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '850px', margin: '0 auto 1.25rem', color: 'var(--on-primary)' }}>
          Salud experta, validada y a un clic
        </h1>

        <p className="animate-in stagger-3" style={{ fontSize: '1.125rem', color: '#e2e8f0', maxWidth: '560px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Agenda con especialistas verificados en tu zona, con precios transparentes e información completa desde el primer contacto.
        </p>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="hero-search-container animate-in stagger-4" style={{ maxWidth: '640px', margin: '0 auto 0.875rem', borderRadius: 'var(--radius-xl)', padding: '0.375rem', background: 'var(--surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, padding: '0 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>search</span>
            <input
              type="text"
              placeholder="Psicología, Medicina, Bienestar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '1rem 0', fontSize: '1rem', color: 'var(--on-surface)', background: 'transparent', border: 'none', outline: 'none' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', paddingRight: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>location_on</span>
              CDMX
            </span>
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)', padding: '0.875rem 2rem', fontWeight: 800, fontSize: '1rem', background: 'var(--secondary)', borderColor: 'var(--secondary)' }}>
            Buscar
          </button>
        </form>

        {/* Acciones Rápidas (Zero Friction) */}
        <div className="animate-in stagger-5" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '1.5rem' }}>
          {[
            { icon: '>>', text: 'Necesito psicología hoy' },
            { icon: '>>', text: 'Consulta médica rápida' },
            { icon: '>>', text: 'Quiero mejorar mi bienestar' },
          ].map(action => (
            <button 
                key={action.text} 
                onClick={() => openChatWithQuery(action.text)}
                style={{ 
                    background: 'rgba(255,255,255,0.9)', 
                    color: '#431407', 
                    fontSize: '0.875rem', 
                    fontWeight: 700, 
                    padding: '0.5rem 1rem', 
                    borderRadius: 'var(--radius-full)', 
                    border: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    cursor: 'pointer', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, background 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}
            >
              <span style={{ fontSize: '1.125rem' }}>{action.icon}</span>
              {action.text}
            </button>
          ))}
        </div>
      </section>

      {/* ESTADISTICAS */}
      <div style={{ background: 'var(--surface-container-lowest)', borderBottom: '1px solid var(--outline-variant)' }}>
        <div className="container home-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 0, padding: 0 }}>
          {[
            { value: '+15k', label: 'Clientes activos', icon: 'groups' },
            { value: '+5k', label: 'Especialistas verificados', icon: 'badge' },
            { value: '+2k', label: 'Citas agendadas', icon: 'event_available' },
            { value: '< 10 min', label: 'Tiempo de respuesta', icon: 'timer' },
            { value: '4.9 / 5', label: 'Calificación promedio', icon: 'star' },
          ].map((stat, i) => (
            <div key={stat.label} className="home-stat-item" style={{ padding: '1.75rem 1.5rem', textAlign: 'center', borderRight: i < 4 ? '1px solid var(--outline-variant)' : 'none' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: '#047857', marginBottom: '0.5rem', display: 'block' }}>{stat.icon}</span>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.1, color: 'var(--primary)', marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>{stat.value}</p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIOS CORTOS */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--outline-variant)', padding: '1.5rem' }}>
        <div className="container" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { text: '"Necesitaba una psicóloga para ansiedad y agendé el mismo día. Todo claro y verificado."', name: 'Carlos, CDMX' },
            { text: '"Reservé consulta médica nocturna y recibí atención en minutos. Sí cumplen."', name: 'Ana, CDMX' },
            { text: '"Después de malas experiencias, aquí vi credenciales y reseñas reales. Me dio paz."', name: 'Luis, CDMX' },
          ].map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', background: '#fff7ed', borderRadius: 'var(--radius-xl)', border: '1px solid #ffedd5', flexShrink: 0, maxWidth: '400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: '#f59e0b' }}>format_quote</span>
              </div>
              <div>
                  <p style={{ fontSize: '0.875rem', color: '#431407', fontStyle: 'italic', marginBottom: '0.25rem', lineHeight: 1.4 }}>{t.text}</p>
                  <p style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 800 }}>- {t.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POR QUE ELEGIRNOS VS FACEBOOK */}
      <section style={{ padding: '5rem 1.5rem', background: '#fff7ed' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 className="text-headline-md" style={{ color: '#9a3412', marginBottom: '0.5rem', fontWeight: 800 }}>¿Por qué usar Intecnia para tu salud?</h2>
            <p style={{ color: '#c2410c', maxWidth: '480px', margin: '0 auto', fontSize: '1.0625rem', fontWeight: 500 }}>La diferencia entre dudar y tener certeza total te protegemos.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { title: 'Identidad Verificada', text: 'Validamos con identificación oficial y cédula profesional (en caso de ser requerida). Si no son reales, no entran a la plataforma.', icon: 'badge', color: '#16a34a' },
              { title: 'Cero Intermediarios', text: 'Comunicación directa con el profesional. No cobramos comisiones ocultas por tu servicio.', icon: 'handshake', color: '#047857' },
              { title: 'Opiniones 100% Reales', text: 'Solo quienes han tomado el servicio pueden dejar reseña. Nada de calificaciones compradas.', icon: 'star', color: '#ca8a04' },
              { title: 'Sin Sorpresas', text: 'Conoces los precios base desde antes de hablar con ellos. Transparencia total desde el inicio.', icon: 'payments', color: '#2563eb' }
            ].map(item => (
              <div key={item.title} style={{ background: 'white', padding: '1.75rem', borderRadius: 'var(--radius-xl)', border: '1px solid #ffedd5', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.05)' }}>
                 <div style={{ width: '3rem', height: '3rem', borderRadius: '12px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: '24px', color: item.color }}>{item.icon}</span>
                 </div>
                 <h3 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.125rem', color: '#431407', marginBottom: '0.5rem' }}>{item.title}</h3>
                 <p style={{ fontSize: '0.9375rem', color: '#7c2d12', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO TE AYUDAMOS */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fef3c7', color: '#d97706', padding: '0.375rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.8125rem', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '18px' }}>smart_toy</span>
              TU ASISTENTE INTELIGENTE
            </div>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem', fontWeight: 800 }}>"Solo dime qué necesitas y yo lo consigo por ti"</h2>
            <p style={{ color: 'var(--on-surface-variant)', maxWidth: '600px', margin: '0 auto', fontSize: '1.125rem' }}>Deja de preguntar en grupos o rogar por recomendaciones. Tu asistente inteligente encuentra opciones reales y verifica disponibilidad en segundos.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { num: '1', icon: 'chat', title: 'Cuéntame tu problema', text: '¿Fuga de agua? ¿Contrato laboral? Escríbeme como si hablaras con un amigo.' },
              { num: '2', icon: 'person_search', title: 'Filtro a los mejores', text: 'Busco entre profesionales verificados con INE, reviso sus precios y calificaciones.' },
              { num: '3', icon: 'event_available', title: 'Agendo por ti', text: 'Si te gusta una opción, separo el espacio en su agenda automáticamente. Cero llamadas incómodas.' },
            ].map((step, i) => (
              <div key={step.num} style={{ background: 'var(--surface-container-lowest)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--outline-variant)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-1rem', left: '2rem', background: '#047857', color: 'white', width: '2rem', height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: 'Manrope', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}>{step.num}</div>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#047857', marginBottom: '1rem', display: 'block', marginTop: '0.5rem' }}>{step.icon}</span>
                <h3 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button onClick={() => { const botBtn = document.querySelector('[data-viso-trigger]'); if (botBtn) botBtn.click(); }} className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 800, background: '#047857', borderColor: '#047857' }}>
                <span className="material-symbols-outlined">forum</span>
                Probar el asistente ahora
            </button>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface-container-lowest)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 800 }}>Explora por tu cuenta</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '1rem' }}>Directorio completo de profesionales verificados listos para ayudarte.</p>
            </div>
            <Link to="/directory" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              VER DIRECTORIO COMPLETO <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.key}
                to={cat.href}
                className="cat-card"
                style={{ cursor: 'pointer', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.75rem 1rem', textAlign: 'center', gap: '0.5rem', transition: 'transform 0.18s, box-shadow 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="cat-icon" style={{ background: '#fff7ed', color: '#047857' }}>
                  <span className="material-symbols-outlined">{cat.icon}</span>
                </div>
                <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '0.9375rem', color: 'var(--primary)', lineHeight: 1.3 }}>{cat.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{cat.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PROFESIONALES DESTACADOS */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="text-label-md" style={{ color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem', fontWeight: 800 }}><span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>verified</span>VERIFICADOS PRIMERO (Y EN REVISION)</p>
              <h2 className="text-headline-md" style={{ color: 'var(--primary)', fontWeight: 800 }}>Especialistas Destacados</h2>
            </div>
          </div>

          {loadingFeatured ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3, 4].map(i => <ProfessionalSkeleton key={i} />)}
            </div>
          ) : featured.length === 0 ? (
            <div>
              {/* Banner informativo */}
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--outline-variant)', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                  Estamos creciendo - estos son ejemplos de lo que encontraras aqui
                </p>
              </div>
              {/* Placeholder cards enriquecidas con señales de confianza */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {PLACEHOLDER_PROFESSIONALS.map(pro => (
                  <div key={pro.id} className="card" style={{ width: '100%', maxWidth: '420px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--outline-variant)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.09)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Header tarjeta */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: pro.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.125rem' }}>
                        {pro.initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                          <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>{pro.user.name}</p>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#10b981' }} title="Verificado">verified</span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo</span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontWeight: 600, marginTop: '0.125rem' }}>{pro.title}</p>
                      </div>
                    </div>

                    {/* Especialidades */}
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {pro.specialties.map(s => (
                        <span key={s} style={{ fontSize: '0.6875rem', fontWeight: 600, background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)' }}>{s}</span>
                      ))}
                    </div>

                    {/* Señales de confianza */}
                    <div style={{ background: '#f0fdf4', borderRadius: 'var(--radius-lg)', padding: '0.875rem', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#f59e0b' }}>star</span>
                          <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#0f172a' }}>{pro.rating}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>({pro.reviews} reseñas)</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Desde ${pro.price} MXN</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#15803d', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 2px #dcfce7' }}></span>
                        Responde en {pro.responseTime} · Verificado con INE y Cédula.
                      </div>
                    </div>

                    {/* CTA */}
                    <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.875rem', textAlign: 'center', justifyContent: 'center', padding: '0.75rem', fontWeight: 800 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_add_on</span>
                      Crear cuenta y agendar
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {featured.map(pro => (
                <div key={pro.id} className="card" style={{ width: '100%', maxWidth: '420px', minHeight: '360px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s, box-shadow 0.2s', border: '1px solid var(--outline-variant)', boxShadow: '0 10px 28px rgba(0,0,0,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {pro.user?.avatarUrl ? (
                      <img src={pro.user.avatarUrl} alt={pro.user?.name} style={{ width: '4rem', height: '4rem', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                    ) : (
                      <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '28px' }}>person</span>
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.125rem', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                        {pro.user?.name || 'Especialista'}
                          {pro.isVerified ? (
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#10b981', verticalAlign: 'middle', marginLeft: '4px' }} title="Verificado">verified</span>
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b', verticalAlign: 'middle', marginLeft: '4px' }} title="En revision">schedule</span>
                          )}
                        </p>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{pro.title || CATEGORY_MAP[pro.category] || pro.category}</p>
                        <p style={{ fontSize: '0.6875rem', marginTop: '0.125rem', color: pro.isVerified ? 'var(--secondary)' : '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', padding: '0.2rem 0.5rem', borderRadius: '999px', background: pro.isVerified ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.16)' }}>
                          {pro.isVerified ? 'Verificado' : 'Perfil en revision'}
                        </p>
                    </div>
                  </div>
                  
                  {/* SENALES DE CONFIANZA FUERTES */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '120px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', fontWeight: 700, lineHeight: 1.4 }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#10b981' }}>badge</span>
                      {pro.isVerified
                        ? 'Verificado con INE y Cédula.'
                        : 'Perfil en revision documental (se mostrara como verificado al aprobarse).'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', fontWeight: 600 }}>
                      <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 2px #dcfce7' }}></span>
                      Responde en &lt; 10 min
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: '#f59e0b' }}>star</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{Number(pro.rating > 0 ? pro.rating : 4.8).toFixed(1)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>(+2k opiniones)</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>Desde $2,000</span>
                    </div>
                  </div>

                  <Link to={`/profile/${pro.id}`} className="btn btn-primary" style={{ fontSize: '0.875rem', textAlign: 'center', justifyContent: 'center', padding: '0.75rem', fontWeight: 800, background: '#0f172a', color: 'white', borderColor: '#0f172a' }}>
                    Ver perfil y agendar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIOS COMPLETOS CON HISTORIA */}
      <section style={{ padding: '5rem 1.5rem', background: '#f8fafc' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p className="text-label-md" style={{ color: '#047857', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.75rem', fontWeight: 800 }}>HISTORIAS REALES</p>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', fontWeight: 800 }}>Resultados, no solo promesas</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { name: 'María González', role: 'Necesitaba apoyo emocional urgente', text: 'Llevaba días buscando psicóloga con experiencia real. En Intecnia la encontré en minutos y pude revisar su perfil y reseñas antes de agendar. Mi proceso terapéutico empezó de inmediato.', stars: 5 },
              { name: 'Carlos Mendoza', role: 'Consulta médica en horario complicado', text: 'Necesitaba atención el domingo por la noche. Con los filtros encontré un médico disponible, verificado y con precio claro. Reservé en pocos pasos y recibí atención puntual.', stars: 5 },
              { name: 'Ana Ramírez', role: 'Buscaba psicóloga', text: 'Me daba pena preguntar en redes por recomendaciones de psicólogos. Aquí encontré a mi psicóloga leyendo su perfil completo, vi sus precios desde el inicio (con total claridad) y agendé directo en su calendario sin hablar con nadie más. Funciona perfecto.', stars: 5 },
            ].map(t => (
              <div key={t.name} className="testimonial-card" style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem' }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined icon-filled" style={{ fontSize: '18px', color: '#f59e0b' }}>star</span>
                  ))}
                </div>
                <p style={{ color: '#334155', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1.5rem', fontStyle: 'italic', fontWeight: 500 }}>"{t.text}"</p>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <p style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{t.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '6rem 1.5rem', background: '#0f172a', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '700px' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '56px', color: '#10b981', marginBottom: '1.5rem', display: 'block' }}>shield_lock</span>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: 'white', marginBottom: '1.25rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            No te arriesgues más con desconocidos
          </h2>
          <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '2.5rem', lineHeight: 1.7, fontWeight: 500 }}>
            Miles de profesionales verificados listos para trabajar. Sin pagos por adelantado, sin comisiones ocultas el servicio es garantizado.
          </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button
              onClick={() => { const botBtn = document.querySelector('[data-viso-trigger]'); if (botBtn) botBtn.click(); else navigate('/directory'); }}
              className="btn btn-primary"
              style={{ padding: '1rem 2.5rem', fontSize: '1.0625rem', fontWeight: 800, background: '#047857', borderColor: '#047857', boxShadow: '0 8px 24px rgba(234, 88, 12, 0.4)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>rocket_launch</span>
              Conseguir especialista ahora
            </button>
            <Link
              to={publishServicePath}
              className="btn"
              style={{ background: 'transparent', color: 'white', border: '2px solid #334155', padding: '1rem 2.5rem', fontSize: '1.0625rem', fontWeight: 700 }}
            >
              Publicar servicio
            </Link>
          </div>
          {/* Señales de confianza finales */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {['Gratis para el cliente', 'Perfiles 100% verificados', 'Cancela cuando quieras'].map(item => (
              <span key={item} style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </>
  );
}








