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

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [priceMin, setPriceMin] = useState(0);
  const [priceCap, setPriceCap] = useState(2000);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verifiedOnly') === 'true');
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
      </div>

      {/* Main Content */}
      <div className="container layout-directory" style={{ paddingBottom: '8rem' }}>
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
                { label: 'Cualquier precio', min: 0, max: 5000 },
                { label: '$0 - $600', min: 0, max: 600 },
                { label: '$600 - $1,200', min: 600, max: 1200 },
                { label: '$1,200 - $2,000', min: 1200, max: 2000 },
                { label: '$2,000 - $5,000', min: 2000, max: 5000 },
              ].map(opt => (
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
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="number" step="200" min="0" max={priceCap} value={priceMin} onChange={(e) => setPriceMin(Math.max(0, Math.min(Number(e.target.value || 0), priceCap)))} className="input-field" />
                <input type="number" step="200" min={priceMin} max="5000" value={priceCap} onChange={(e) => setPriceCap(Math.max(priceMin, Math.min(Number(e.target.value || 0), 5000)))} className="input-field" />
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="200"
                value={priceCap}
                onChange={(e) => setPriceCap(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--secondary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem' }}>
                <span>$0</span>
                <span>${priceMin.toLocaleString('es-MX')} - ${priceCap.toLocaleString('es-MX')} MXN</span>
                <span>$5,000</span>
              </div>
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

          <button onClick={(e) => { e.preventDefault(); setSelectedCategory(''); setPriceMin(0); setPriceCap(2000); setMinRating(0); setVerifiedOnly(false); showToast('Filtros reiniciados', 'info'); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Limpiar Filtros</button>
        </aside>

        {/* Results */}
        <div>
          {/* Banner de zona - reemplaza el mapa */}
          <div className="directory-map-banner" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'var(--secondary-container)', borderRadius: 'var(--radius-xl)', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary)' }}>location_on</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-secondary-container)' }}>
              Mostrando profesionales verificados en <strong>CDMX y área metropolitana</strong> 
            </p>
            <button style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Ver en mapa
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
          <div className="directory-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1.25rem' }}>
            {professionals.map(p => (
              <div key={p.id} className="pro-card" style={{ cursor: 'pointer', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
                  <Link to={`/profile/${p.id}`} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={p.avatarUrl || '/default-avatar.png'} alt={p.name} style={{ width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-lg)', objectFit: 'cover', background: 'var(--surface-container)' }} />
                      {p.isVerified ? (
                        <span className="material-symbols-outlined icon-filled" style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '14px', color: 'var(--secondary)', background: 'var(--surface-container-lowest)', borderRadius: '50%', padding: '1px' }}>verified</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '14px', color: '#f59e0b', background: 'var(--surface-container-lowest)', borderRadius: '50%', padding: '1px' }}>schedule</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>{p.name}</h3>
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
                    </div>
                  </div>
                  </Link>
                  <div className="directory-card-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <Link to={`/profile/${p.id}?tab=chat`} className="btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span> Mensaje
                    </Link>
                    <Link to={`/profile/${p.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.8125rem', textDecoration: 'none' }}>Ver Perfil</Link>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}



