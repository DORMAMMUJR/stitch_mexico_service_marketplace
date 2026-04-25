import React from 'react';
import { Link } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

const professionals = [
  { 
    id: 'prof-pamela-001', 
    name: 'Pamela Osnaya', 
    title: 'PSICÓLOGA CLÍNICA • PREMIUM', 
    jobs: 85, 
    exp: '10y', 
    rating: 5.0, 
    desc: 'Especialista en terapia de pareja, adolescentes y post-separación. Consulta presencial en CDMX y en línea. Sesiones personalizadas con enfoque cognitivo-conductual.', 
    img: '/pamela.jpg', 
    tier: 'premium'  
  }
];

export function DirectoryPage() {
  return (
    <>
      <NavbarIntecnia />

      {/* Breadcrumb */}
      <div className="container" style={{ padding: '1rem 1.5rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Link to="/">INICIO</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          <Link to="/categories">DIRECTORIO</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>RESULTADOS DE BÚSQUEDA</span>
        </nav>
      </div>

      {/* Search Header */}
      <div className="container" style={{ padding: '0 1.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Psicólogos Clínicos Verificados</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>1 profesional verificado encontrado en tu área</p>
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Ordenar por: Recomendado
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container layout-directory">
        {/* Filters Sidebar */}
        <aside className="card hide-mobile" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '5rem' }}>
          <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--secondary)', marginBottom: '1.5rem' }}>Filtros</h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CATEGORÍA</label>
            <select defaultValue="Salud y Bienestar" style={{ width: '100%', padding: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
              <option>Salud y Bienestar</option>
              <option>Consultoría Legal</option>
              <option>Contabilidad y Finanzas</option>
              <option>Tecnología y Desarrollo</option>
              <option>Diseño y Creatividad</option>
              <option>Educación y Tutorías</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>RANGO DE PRECIOS (MXN)</label>
            <input type="range" min="200" max="5000" defaultValue="1500" style={{ width: '100%', accentColor: 'var(--secondary)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
              <span>$200</span><span>$5,000+</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CALIFICACIÓN MÍNIMA</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" style={{ accentColor: 'var(--secondary)' }} /> 4.5+ Estrellas
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" style={{ accentColor: 'var(--secondary)' }} /> 4.0+ Estrellas
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>NIVEL DE VERIFICACIÓN</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--secondary)' }}>verified</span>
              Premium <input type="checkbox" style={{ marginLeft: 'auto', accentColor: 'var(--secondary)' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}>verified</span>
              Standard <input type="checkbox" style={{ marginLeft: 'auto', accentColor: 'var(--secondary)' }} />
            </label>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>DISPONIBILIDAD</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(45,188,254,0.1)', color: 'var(--secondary)', cursor: 'pointer' }}>Urgente</span>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Hoy</span>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 500, background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>Fin de semana</span>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Aplicar Filtros</button>
        </aside>

        {/* Results */}
        <div>
          {/* Map */}
          <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', height: '220px', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'var(--surface-container-lowest)', padding: '0.375rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 600, boxShadow: 'var(--ambient-shadow)', zIndex: 1 }}>VISTA DE MAPA: CDMX</div>
            <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=300&fit=crop" alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            <div style={{ position: 'absolute', top: '50%', left: '40%', transform: 'translate(-50%,-50%)' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '32px', color: 'var(--secondary)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>location_on</span>
            </div>
          </div>

          {/* Professional Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.25rem' }}>
            {professionals.map(p => (
              <div key={p.id} className="pro-card" style={{ cursor: 'pointer' }}>
                <Link to={`/intecnia-profile/${p.id}`} style={{ display: 'block', color: 'inherit' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={p.img} alt={p.name} style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover' }} />
                      <span className="material-symbols-outlined icon-filled" style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '14px', color: 'var(--secondary)', background: 'var(--surface-container-lowest)', borderRadius: '50%', padding: '1px' }}>verified</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{p.name}</h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-tertiary-container)' }}>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>star</span> {p.rating}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{p.title}</p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span> {p.jobs} Trabajos
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span> {p.exp} Exp.
                        </span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5, marginBottom: '1rem' }}>{p.desc}</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '0.8125rem' }}>Mensaje</button>
+                    <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem' }}>Contratar</button>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            {[1,2,3].map((n,i) => (
              <button key={n} style={{ width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500, background: i === 0 ? 'var(--primary)' : 'var(--surface-container-lowest)', color: i === 0 ? 'var(--on-primary)' : 'var(--on-surface)', boxShadow: i !== 0 ? 'var(--ambient-shadow)' : 'none' }}>
                {n}
              </button>
            ))}
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--on-surface-variant)' }}>...</span>
            <button style={{ width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-md)', background: 'var(--surface-container-lowest)', boxShadow: 'var(--ambient-shadow)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
