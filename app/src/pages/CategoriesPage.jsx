import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NavbarIntecnia from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { TrustBar } from '../components/TrustBar';
import { useToast } from '../components/ToastContext';

export function CategoriesPage() {
  const categories = [
    { id: 1, icon: 'health_and_safety', name: 'Salud y Bienestar', desc: 'Consultoría médica, fisioterapia y especialistas en salud integral con cédula profesional.', count: '856 Expertos', color: 'var(--secondary)' },
    { id: 2, icon: 'devices', name: 'Servicios Digitales', desc: 'Desarrollo de software, marketing digital y transformación tecnológica para negocios.', count: '2,105 Expertos', color: 'var(--secondary)' },
    { id: 3, icon: 'school', name: 'Educación', desc: 'Tutorías académicas, capacitación corporativa y enseñanza de idiomas certificados.', count: '642 Expertos', color: 'var(--secondary)' },
    { id: 4, icon: 'gavel', name: 'Legal y Fiscal', desc: 'Asesoría jurídica, contabilidad y cumplimiento fiscal para personas físicas y morales.', count: '420 Expertos', color: 'var(--secondary)' },
  ];

  const [viewMode, setViewMode] = useState('grid');
  const { showToast } = useToast();

  const handleViewChange = (mode) => {
    setViewMode(mode);
    showToast(`Vista cambiada a ${mode === 'grid' ? 'Cuadrícula' : 'Lista'}`, 'info');
  };

  return (
    <>
      <NavbarIntecnia />

      {/* Hero Banner */}
      <section style={{ margin: '1.5rem', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--primary)', position: 'relative', padding: '3rem 2.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right,var(--primary-container),var(--primary))', opacity: 0.9 }}></div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: '280px' }}>
          <span style={{ display: 'inline-block', background: 'var(--secondary)', color: 'var(--on-secondary)', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            EXPLORAR
          </span>
          <h1 style={{ fontFamily: 'Manrope', fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, color: 'var(--on-primary)', lineHeight: 1.1, marginBottom: '1rem' }}>
            Encuentra al<br />Especialista<br /><em style={{ fontStyle: 'italic', color: 'var(--primary-fixed-dim)' }}>Adecuado para Ti.</em>
          </h1>
          <p style={{ color: 'var(--primary-fixed-dim)', fontSize: '0.9375rem', maxWidth: '400px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Accede a nuestro directorio de expertos verificados bajo los más altos estándares de calidad y cumplimiento profesional.
          </p>
          <Link to="/directory" className="btn" style={{ background: 'var(--secondary)', color: 'var(--on-secondary)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1.5rem', display: 'inline-flex' }}>
            Explorar Servicios <span className="material-symbols-outlined" style={{ fontSize: '18px', marginLeft: '0.5rem' }}>arrow_forward</span>
          </Link>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: '0 0 auto', maxWidth: '320px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop" alt="Professional building" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </section>

      {/* Categories Section */}
      <section className="container" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '0.25rem' }}>Categorías de Servicio</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Soluciones profesionales segmentadas por especialidad técnica y académica.</p>
          </div>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
            <button 
              onClick={() => handleViewChange('grid')} 
              className={viewMode === 'grid' ? "active-toggle" : ""} 
              style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem', fontWeight: 500, background: viewMode === 'grid' ? 'var(--surface-container-lowest)' : 'transparent', color: viewMode === 'grid' ? 'var(--on-surface)' : 'var(--on-surface-variant)', border: 'none', cursor: 'pointer' }}
            >
              Cuadrícula
            </button>
            <button 
              onClick={() => handleViewChange('list')} 
              className={viewMode === 'list' ? "active-toggle" : ""} 
              style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem', fontWeight: 500, background: viewMode === 'list' ? 'var(--surface-container-lowest)' : 'transparent', color: viewMode === 'list' ? 'var(--on-surface)' : 'var(--on-surface-variant)', border: 'none', cursor: 'pointer' }}
            >
              Lista
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Featured Large Card */}
          <Link to="/directory" style={{ gridRow: 'span 2', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', minHeight: '420px', cursor: 'pointer', display: 'block' }}>
            <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&h=600&fit=crop" alt="Mantenimiento" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,3,10,0.85) 30%,transparent 70%)' }}></div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem', color: 'var(--on-primary)', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>construction</span>
                <span style={{ background: 'var(--secondary)', color: 'var(--on-secondary)', fontSize: '0.625rem', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-md)', textTransform: 'uppercase', fontWeight: 600 }}>POPULAR</span>
              </div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.375rem', marginBottom: '0.375rem' }}>Mantenimiento y Oficios</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--primary-fixed-dim)', lineHeight: 1.5, marginBottom: '1rem' }}>Servicios especializados para infraestructuras residenciales e industriales con garantía de ejecución.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 500 }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px', color: 'var(--secondary-container)' }}>verified</span>
                  1,240 Expertos Verificados
                </span>
                <span style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--on-secondary)' }}>arrow_outward</span>
                </span>
              </div>
            </div>
          </Link>

          {categories.map(cat => (
            <Link key={cat.id} to="/directory" className="cat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
              <div className="cat-icon" style={{ background: 'rgba(0,101,141,0.08)', color: cat.color }}>
                <span className="material-symbols-outlined">{cat.icon}</span>
              </div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--primary)' }}>{cat.name}</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.8125rem', lineHeight: 1.5, flex: 1 }}>{cat.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)' }}>{cat.count}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>chevron_right</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Events Card */}
        <Link to="/directory" style={{ marginTop: '1.25rem', borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: '180px', cursor: 'pointer', display: 'block', maxWidth: '50%', minWidth: '300px' }}>
          <img src="https://images.unsplash.com/photo-1540575467063-178a50da2fd8?w=600&h=250&fit=crop" alt="Eventos" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,3,10,0.8) 50%,transparent)' }}></div>
          <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.5rem', color: 'var(--on-primary)', zIndex: 1 }}>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.25rem' }}>Eventos y Producción</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--primary-fixed-dim)', marginBottom: '0.75rem' }}>Planificación logística y técnica para eventos de alto impacto.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>312 Expertos</span>
              <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 500 }}>Ver Directorio</span>
            </div>
          </div>
        </Link>
      </section>

      <TrustBar />
      <Footer />
    </>
  );
}
