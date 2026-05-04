import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';

// Mapeo de categoría de backend → label legible
const CATEGORY_MAP = {
  'HEALTH_WELLNESS': 'Salud y Bienestar',
  'LEGAL': 'Consultoría Legal',
  'FINANCE_TAX': 'Contabilidad y Finanzas',
  'IT_SECURITY': 'Tecnología y Desarrollo',
  'ENGINEERING': 'Ingeniería',
  'PLUMBING': 'Plomería',
  'ELECTRICAL': 'Electricidad',
  'HVAC': 'Climatización',
  'GENERAL_MAINTENANCE': 'Mantenimiento General',
};

// Mapeo inverso para los filtros
const FILTER_TO_CATEGORY = {
  'Salud y Bienestar': 'HEALTH_WELLNESS',
  'Consultoría Legal': 'LEGAL',
  'Contabilidad y Finanzas': 'FINANCE_TAX',
  'Tecnología y Desarrollo': 'IT_SECURITY',
  'Ingeniería': 'ENGINEERING',
  'Educación y Tutorías': 'GENERAL_MAINTENANCE',
};

export function DirectoryPage() {
  const [searchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [priceRange, setPriceRange] = useState('all'); // 'all' | '0-500' | '500-1000' | '1000-2000' | '2000+'
  const [minRating, setMinRating] = useState(0);
  const [filterVersion, setFilterVersion] = useState(0);
  const { showToast } = useToast();

  // Leer category y query de la URL (vienen del Hero o de las categorías)
  const queryFromUrl = searchParams.get('q') || '';
  const categoryFromUrl = searchParams.get('category') || '';

  // Estado de categoría inicializado desde la URL
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);

  // Si cambia la URL (navegación entre categorías), sincronizar el filtro
  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);


  useEffect(() => {
    const fetchProfessionals = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (queryFromUrl) params.set('q', queryFromUrl);
        if (selectedCategory) params.set('category', selectedCategory);
        if (priceRange !== 'all') {
          const [min, max] = priceRange === '2000+'
            ? ['2000', '']
            : priceRange.split('-');
          if (min) params.set('minPrice', min);
          if (max) params.set('maxPrice', max);
        }
        if (minRating > 0) params.set('minRating', String(minRating));

        const res = await fetch(`/api/professionals?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProfessionals(data);
        }
      } catch (err) {
        console.error('Error fetching professionals:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfessionals();
  }, [queryFromUrl, selectedCategory, priceRange, minRating, filterVersion]);

  const handleCategoryChange = (e) => {
    const label = e.target.value;
    setSelectedCategory(FILTER_TO_CATEGORY[label] || '');
  };

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
            <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {queryFromUrl ? `Resultados para "${queryFromUrl}"` : 'Profesionales Verificados'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              {isLoading ? 'Buscando...' : `${professionals.length} profesional${professionals.length !== 1 ? 'es' : ''} verificado${professionals.length !== 1 ? 's' : ''} encontrado${professionals.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={(e) => { e.preventDefault(); showToast('Ordenando por recomendaciones...', 'info'); }} className="btn btn-outline" style={{ fontSize: '0.8125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Ordenar por: Recomendado
          </button>
        </div>
        {/* Category Quick Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedCategory('')} className={`btn ${selectedCategory === '' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Todos</button>
          {Object.entries(FILTER_TO_CATEGORY).map(([label, key]) => (
            <button key={key} onClick={() => setSelectedCategory(key)} className={`btn ${selectedCategory === key ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container layout-directory">
        {/* Filters Sidebar */}
        <aside className="card hide-mobile" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '5rem' }}>
          <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--secondary)', marginBottom: '1.5rem' }}>Filtros</h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CATEGORÍA</label>
            <select onChange={handleCategoryChange} defaultValue="" style={{ width: '100%', padding: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
              <option value="">Todas las categorías</option>
              <option>Salud y Bienestar</option>
              <option>Consultoría Legal</option>
              <option>Contabilidad y Finanzas</option>
              <option>Tecnología y Desarrollo</option>
              <option>Ingeniería</option>
              <option>Educación y Tutorías</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>RANGO DE PRECIOS (MXN)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {[
                { label: 'Cualquier precio', value: 'all' },
                { label: '$0 – $500', value: '0-500' },
                { label: '$500 – $1,000', value: '500-1000' },
                { label: '$1,000 – $2,000', value: '1000-2000' },
                { label: '$2,000+', value: '2000+' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPriceRange(opt.value)}
                  style={{
                    textAlign: 'left', padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: priceRange === opt.value ? 700 : 400,
                    background: priceRange === opt.value ? 'var(--secondary-container)' : 'transparent',
                    color: priceRange === opt.value ? 'var(--secondary)' : 'var(--on-surface)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CALIFICACIÓN MÍNIMA</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" checked={minRating === 4.5} onChange={() => setMinRating(4.5)} style={{ accentColor: 'var(--secondary)' }} /> 4.5+ Estrellas
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" checked={minRating === 4} onChange={() => setMinRating(4)} style={{ accentColor: 'var(--secondary)' }} /> 4.0+ Estrellas
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="radio" name="rating" checked={minRating === 0} onChange={() => setMinRating(0)} style={{ accentColor: 'var(--secondary)' }} /> Todas
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

          <button onClick={(e) => { e.preventDefault(); setFilterVersion(v => v + 1); showToast('Filtros aplicados correctamente', 'success'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Aplicar Filtros</button>
        </aside>

        {/* Results */}
        <div>
          {/* Banner de zona — reemplaza el mapa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'var(--secondary-container)', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary)' }}>location_on</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-secondary-container)' }}>
              Mostrando profesionales verificados en <strong>CDMX y área metropolitana</strong>
            </p>
            <button style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Ver en mapa →
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
              Cargando profesionales...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && professionals.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--on-surface-variant)', marginBottom: '1rem', display: 'block' }}>person_search</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>No se encontraron profesionales</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Intenta ajustar los filtros o buscar con otros términos.</p>
            </div>
          )}

          {/* Professional Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.25rem' }}>
            {professionals.map(p => (
              <div key={p.id} className="pro-card" style={{ cursor: 'pointer' }}>
                <Link to={`/profile/${p.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={p.avatarUrl || '/default-avatar.png'} alt={p.name} style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', background: 'var(--surface-container)' }} />
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
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>star</span> {p.reviewCount} Reseñas
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>category</span> {CATEGORY_MAP[p.category] || p.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link to={`/profile/${p.id}`} className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>smart_toy</span> Mensaje
                  </Link>
                  <Link to={`/profile/${p.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', textDecoration: 'none' }}>Ver Perfil</Link>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
