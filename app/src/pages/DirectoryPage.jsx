import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';

// Mapeo de categoría de backend -> label legible
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

const PRICE_RANGES = [
  { label: 'Todos', min: 0, max: 5000 },
  { label: '$0 - $500', min: 0, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $2,000', min: 1000, max: 2000 },
  { label: '$2,000+', min: 2000, max: 5000 },
];

const PLACEHOLDER_PROFESSIONALS = [
  {
    id: 'placeholder-legal-1',
    IS_PLACEHOLDER: true,
    name: 'Lic. Daniela Ruiz',
    title: 'Consultora Legal',
    category: 'LEGAL',
    rating: 4.9,
    reviewCount: 27,
    price: 850,
    isVerified: true,
    avatarUrl: null,
  },
  {
    id: 'placeholder-tech-2',
    IS_PLACEHOLDER: true,
    name: 'Ing. Marco Salinas',
    title: 'Especialista en Soporte TI',
    category: 'IT_SECURITY',
    rating: 4.8,
    reviewCount: 19,
    price: 1200,
    isVerified: true,
    avatarUrl: null,
  },
];

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [priceMin, setPriceMin] = useState(0);
  const [priceCap, setPriceCap] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verifiedOnly') === 'true');
  const { showToast } = useToast();
  const avatarFallback = '/default-avatar.svg';

  // Leer category y query de la URL (vienen del Hero o de las categorías)
  const queryFromUrl = searchParams.get('q') || '';
  const categoryFromUrl = searchParams.get('category') || '';
  const showingPlaceholders = !isLoading && professionals.length === 0;
  const resultsToRender = showingPlaceholders ? PLACEHOLDER_PROFESSIONALS : professionals;

  // Estado de categoría inicializado desde la URL
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl);

  // Si cambia la URL (navegación entre categorías), sincronizar el filtro
  useEffect(() => {
    setSelectedCategory(categoryFromUrl);
  }, [categoryFromUrl]);

  useEffect(() => {
    setVerifiedOnly(searchParams.get('verifiedOnly') === 'true');
  }, [searchParams]);

  useEffect(() => {
    setSearchTerm(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (verifiedOnly) {
      next.set('verifiedOnly', 'true');
    } else {
      next.delete('verifiedOnly');
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [verifiedOnly, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        if (selectedCategory) params.set('category', selectedCategory);
        params.set('minPrice', String(priceMin));
        params.set('maxPrice', String(priceCap));
        if (minRating > 0) params.set('minRating', String(minRating));
        if (verifiedOnly) params.set('verifiedOnly', 'true');

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
  }, [searchTerm, selectedCategory, priceMin, priceCap, minRating, verifiedOnly]);

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  return (
    <>
      <NavbarIntecnia />

      {/* Breadcrumb */}
      <div className="container" style={{ padding: '1rem 1.5rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Link to="/">INICIO</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>RESULTADOS DE BUSQUEDA</span>
        </nav>
      </div>

      {/* Search Header */}
      <div className="container" style={{ padding: '0 1.5rem 1.5rem' }}>
        {searchParams.get('welcome') === 'professional' && (
          <div style={{ marginBottom: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', color: '#065f46', borderRadius: 'var(--radius-lg)', padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Tu perfil ya es visible en el directorio para los clientes.
          </div>
        )}
        <div className="directory-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {queryFromUrl ? `Resultados para "${queryFromUrl}"` : 'Profesionales Verificados'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              {isLoading ? 'Buscando...' : `${professionals.length} profesional${professionals.length !== 1 ? 'es' : ''} encontrado${professionals.length !== 1 ? 's' : ''}${verifiedOnly ? ' (solo verificados)' : ''}`}
            </p>
          </div>
          <button onClick={(e) => { e.preventDefault(); showToast('Ordenando por recomendaciones...', 'info'); }} className="btn btn-outline directory-sort-btn" style={{ fontSize: '0.8125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            Ordenar por: Recomendado
          </button>
        </div>
        <div className="directory-search-box" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por servicio o especialidad..."
            className="input-field directory-search-input"
            style={{ border: 'none', boxShadow: 'none', background: 'transparent', padding: '0.5rem 0.25rem' }}
          />
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            id="verified-only-top"
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            style={{ accentColor: 'var(--secondary)' }}
          />
          <label htmlFor="verified-only-top" style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            Solo verificados
          </label>
        </div>
        {/* Category Quick Filters */}
        <div className="directory-quick-filters" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedCategory('')} className={`btn ${selectedCategory === '' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Todos</button>
          {Object.entries(FILTER_TO_CATEGORY).map(([label, key]) => (
            <button key={key} onClick={() => setSelectedCategory(key)} className={`btn ${selectedCategory === key ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
              {label}
            </button>
          ))}
        </div>
        <div className="directory-quick-filters" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => { setPriceMin(range.min); setPriceCap(range.max); }}
              className={`btn ${priceMin === range.min && priceCap === range.max ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="container layout-directory pb-32 max-md:pb-36" style={{ paddingBottom: '8rem' }}>
        {/* Filters Sidebar */}
        <aside className="card hide-mobile" style={{ padding: '1.5rem', height: 'fit-content', position: 'sticky', top: '5rem' }}>
          <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--secondary)', marginBottom: '1.5rem' }}>Filtros</h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CATEGORÍA</label>
            <select value={selectedCategory} onChange={handleCategoryChange} style={{ width: '100%', padding: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--on-surface)' }}>
              <option value="">Todas las categorías</option>
              <option value="HEALTH_WELLNESS">Salud y Bienestar</option>
              <option value="LEGAL">Consultoría Legal</option>
              <option value="FINANCE_TAX">Contabilidad y Finanzas</option>
              <option value="IT_SECURITY">Tecnología y Desarrollo</option>
              <option value="ENGINEERING">Ingeniería</option>
              <option value="GENERAL_MAINTENANCE">Educación y Tutorías</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>RANGO DE PRECIOS (MXN)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {PRICE_RANGES.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { setPriceMin(opt.min); setPriceCap(opt.max); }}
                  style={{
                    textAlign: 'left', padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: (priceMin === opt.min && priceCap === opt.max) ? 700 : 400,
                    background: (priceMin === opt.min && priceCap === opt.max) ? 'var(--secondary-container)' : 'transparent',
                    color: (priceMin === opt.min && priceCap === opt.max) ? 'var(--secondary)' : 'var(--on-surface)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
              Rango activo: ${priceMin.toLocaleString('es-MX')} - ${priceCap.toLocaleString('es-MX')} MXN
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>CALIFICACION MÍNIMA</label>
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
            <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>VERIFICACION</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                style={{ accentColor: 'var(--secondary)' }}
              />
              Solo perfiles verificados
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

          <button onClick={(e) => { e.preventDefault(); setSelectedCategory(''); setPriceMin(0); setPriceCap(5000); setMinRating(0); setVerifiedOnly(false); showToast('Filtros reiniciados', 'info'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Limpiar Filtros</button>
        </aside>

        {/* Results */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem', border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary)' }}>view_module</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>
              Vista principal: listado de especialistas con datos clave y precio visible.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
              Cargando profesionales...
            </div>
          )}

          {/* Empty State + Placeholder */}
          {showingPlaceholders && (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', display: 'block' }}>person_search</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>Directorio en actualización</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Mostrando especialistas de ejemplo mientras llegan más perfiles reales.</p>
            </div>
          )}

          {/* Professional Cards Grid */}
          <div className="directory-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.25rem' }}>
            {resultsToRender.map((p) => {
              const profilePath = p.IS_PLACEHOLDER ? '/register?role=professional' : `/profile/${p.id}`;
              const chatPath = p.IS_PLACEHOLDER ? '/register?role=professional' : `/profile/${p.id}?tab=chat`;
              return (
              <div key={p.id} className="pro-card" style={{ cursor: 'pointer', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
                  <Link to={profilePath} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div className="directory-avatar" style={{ position: 'relative' }}>
                      <img
                        src={p.avatarUrl || avatarFallback}
                        alt={p.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = avatarFallback;
                        }}
                      />
                      {p.isVerified ? (
                        <span className="material-symbols-outlined icon-filled" style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '14px', color: 'var(--secondary)', background: 'var(--surface-container-lowest)', borderRadius: '50%', padding: '1px' }}>verified</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '14px', color: '#f59e0b', background: 'var(--surface-container-lowest)', borderRadius: '50%', padding: '1px' }}>schedule</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                          {p.name}
                          {p.IS_PLACEHOLDER && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.625rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '0.125rem 0.35rem', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Demo
                            </span>
                          )}
                        </h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-tertiary-container)' }}>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>star</span> {p.rating}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{p.title}</p>
                      <p style={{ fontSize: '0.6875rem', marginTop: '0.125rem', color: p.isVerified ? 'var(--secondary)' : '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {p.isVerified ? 'Verificado' : 'En revisión'}
                      </p>
                      <p style={{ fontSize: '0.6875rem', marginTop: '0.125rem', color: '#15803d', fontWeight: 700 }}>
                        {p.isVerified ? 'Verificado con INE y Cédula' : ''}
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>star</span> {p.reviewCount} Reseñas
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>category</span> {CATEGORY_MAP[p.category] || p.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem', color: 'var(--primary)', fontWeight: 700 }}>
                        Desde ${Number(p.price || 2000).toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                  </div>
                  </Link>
                  <div className="directory-card-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to={chatPath} className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span> Mensaje
                    </Link>
                    <Link to={profilePath} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', textDecoration: 'none' }}>{p.IS_PLACEHOLDER ? 'Ver ejemplo' : 'Ver Perfil'}</Link>
                  </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}



