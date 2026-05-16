import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';

const HEALTH_CATEGORY = 'HEALTH_WELLNESS';

const CATEGORY_MAP = {
  HEALTH_WELLNESS: 'Salud y Bienestar',
};

const MEDICAL_SPECIALTY_LABELS = {
  MEDICINA_GENERAL: 'Medicina general',
  PEDIATRIA: 'Pediatria',
  GINECOLOGIA: 'Ginecologia',
  TRAUMATOLOGIA: 'Traumatologia',
  ORTOPEDIA: 'Ortopedia',
  DERMATOLOGIA: 'Dermatologia',
  PSIQUIATRIA: 'Psiquiatria',
  PSICOLOGIA: 'Psicologia',
  CARDIOLOGIA: 'Cardiologia',
  ODONTOLOGIA: 'Odontologia',
  NUTRICION: 'Nutricion',
  MEDICINA_INTERNA: 'Medicina interna',
};

const HEALTH_FILTERS = [
  { label: 'Psicologia', query: 'psicologia' },
  { label: 'Medicina', query: 'medicina' },
  { label: 'Bienestar', query: 'bienestar' },
];

const INSURER_OPTIONS = ['GNP', 'AXA', 'METLIFE', 'MAPFRE', 'ALLIANZ', 'BBVA', 'INBURSA', 'QUALITAS', 'PLAN_PRIVADO'];
const CONSULTATION_MODE_OPTIONS = [
  { value: 'PRESENCIAL', label: 'Consultorio presencial' },
  { value: 'DOMICILIO', label: 'Visita a domicilio' },
  { value: 'TELEMEDICINA', label: 'Telemedicina' },
];

const PRICE_RANGES = [
  { label: 'Todos', min: 0, max: 5000 },
  { label: '$0 - $500', min: 0, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $2,000', min: 1000, max: 2000 },
  { label: '$2,000+', min: 2000, max: 5000 },
];

export function DirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [priceMin, setPriceMin] = useState(0);
  const [priceCap, setPriceCap] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verifiedOnly') === 'true');
  const [symptomTerm, setSymptomTerm] = useState(searchParams.get('symptom') || '');
  const [consultationMode, setConsultationMode] = useState(searchParams.get('consultationMode') || '');
  const [selectedInsurers, setSelectedInsurers] = useState(
    (searchParams.get('insurers') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

  const { showToast } = useToast();
  const avatarFallback = '/default-avatar.svg';

  const queryFromUrl = searchParams.get('q') || '';

  useEffect(() => {
    setSearchTerm(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    setVerifiedOnly(searchParams.get('verifiedOnly') === 'true');
    setSymptomTerm(searchParams.get('symptom') || '');
    setConsultationMode(searchParams.get('consultationMode') || '');
    setSelectedInsurers(
      (searchParams.get('insurers') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (verifiedOnly) next.set('verifiedOnly', 'true');
    else next.delete('verifiedOnly');

    if (symptomTerm.trim()) next.set('symptom', symptomTerm.trim());
    else next.delete('symptom');

    if (consultationMode) next.set('consultationMode', consultationMode);
    else next.delete('consultationMode');

    if (selectedInsurers.length > 0) next.set('insurers', selectedInsurers.join(','));
    else next.delete('insurers');

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [verifiedOnly, symptomTerm, consultationMode, selectedInsurers, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchProfessionals = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('category', HEALTH_CATEGORY);
        if (searchTerm.trim()) params.set('q', searchTerm.trim());
        params.set('minPrice', String(priceMin));
        params.set('maxPrice', String(priceCap));
        if (minRating > 0) params.set('minRating', String(minRating));
        if (verifiedOnly) params.set('verifiedOnly', 'true');
        if (symptomTerm.trim()) params.set('symptom', symptomTerm.trim());
        if (consultationMode) params.set('consultationMode', consultationMode);
        if (selectedInsurers.length > 0) params.set('insurers', selectedInsurers.join(','));

        const res = await fetch(`/api/professionals?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProfessionals(Array.isArray(data) ? data : []);
        } else {
          setProfessionals([]);
        }
      } catch {
        setProfessionals([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfessionals();
  }, [searchTerm, priceMin, priceCap, minRating, verifiedOnly, symptomTerm, consultationMode, selectedInsurers]);

  const toggleInsurer = (insurer) => {
    setSelectedInsurers((prev) => (prev.includes(insurer) ? prev.filter((item) => item !== insurer) : [...prev, insurer]));
  };

  const summaryLabel = useMemo(() => {
    if (isLoading) return 'Buscando especialistas...';
    const count = professionals.length;
    return `${count} especialista${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}${verifiedOnly ? ' (solo verificados)' : ''}`;
  }, [isLoading, professionals.length, verifiedOnly]);

  const filterPanel = (
    <>
      <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--secondary)', marginBottom: '1rem' }}>Filtros</h3>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>Rango de precios (MXN)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {PRICE_RANGES.map((opt) => (
            <button
              key={opt.label}
              onClick={() => { setPriceMin(opt.min); setPriceCap(opt.max); }}
              style={{
                textAlign: 'left',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: priceMin === opt.min && priceCap === opt.max ? 700 : 500,
                background: priceMin === opt.min && priceCap === opt.max ? 'var(--secondary-container)' : 'transparent',
                color: priceMin === opt.min && priceCap === opt.max ? 'var(--secondary)' : 'var(--on-surface)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>Calificacion minima</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
          <input type="radio" name="rating" checked={minRating === 4.5} onChange={() => setMinRating(4.5)} style={{ accentColor: 'var(--secondary)' }} /> 4.5+ estrellas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', marginBottom: '0.375rem', cursor: 'pointer' }}>
          <input type="radio" name="rating" checked={minRating === 4} onChange={() => setMinRating(4)} style={{ accentColor: 'var(--secondary)' }} /> 4.0+ estrellas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
          <input type="radio" name="rating" checked={minRating === 0} onChange={() => setMinRating(0)} style={{ accentColor: 'var(--secondary)' }} /> Todas
        </label>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>Modalidad</label>
        <div style={{ display: 'grid', gap: '0.375rem' }}>
          {CONSULTATION_MODE_OPTIONS.map((mode) => (
            <label key={mode.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="radio" name="consultation-mode" checked={consultationMode === mode.value} onChange={() => setConsultationMode(mode.value)} style={{ accentColor: 'var(--secondary)' }} />
              {mode.label}
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
            <input type="radio" name="consultation-mode" checked={consultationMode === ''} onChange={() => setConsultationMode('')} style={{ accentColor: 'var(--secondary)' }} />
            Cualquiera
          </label>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.5rem' }}>Aseguradoras</label>
        <div style={{ display: 'grid', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {INSURER_OPTIONS.map((insurer) => (
            <label key={insurer} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedInsurers.includes(insurer)} onChange={() => toggleInsurer(insurer)} style={{ accentColor: 'var(--secondary)' }} />
              {insurer}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.preventDefault();
          setPriceMin(0);
          setPriceCap(5000);
          setMinRating(0);
          setVerifiedOnly(false);
          setSymptomTerm('');
          setConsultationMode('');
          setSelectedInsurers([]);
          showToast('Filtros reiniciados', 'info');
        }}
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Limpiar filtros
      </button>
    </>
  );

  return (
    <>
      <NavbarIntecnia activePage="directory" />

      <div className="container" style={{ padding: '1rem 1.5rem' }}>
        <nav style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Link to="/">INICIO</Link>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
          <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>DIRECTORIO SALUD</span>
        </nav>
      </div>

      <div className="container" style={{ padding: '0 1.5rem 1.25rem' }}>
        <div className="directory-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              {queryFromUrl ? `Resultados para \"${queryFromUrl}\"` : 'Especialistas de salud verificados'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{summaryLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="btn btn-outline directory-mobile-filters-toggle"
            style={{ fontSize: '0.8125rem' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>tune</span>
            {mobileFiltersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        <div className="directory-search-box" style={{ marginTop: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Psicologia, medicina, bienestar..."
            className="input-field directory-search-input"
            style={{ border: 'none', boxShadow: 'none', background: 'transparent', padding: '0.5rem 0.25rem' }}
          />
        </div>

        <div className="directory-quick-filters" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setSearchTerm('')} className={`btn ${searchTerm.trim() === '' ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>Todos</button>
          {HEALTH_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setSearchTerm(filter.query)}
              className={`btn ${searchTerm.toLowerCase().includes(filter.query) ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="directory-quick-filters" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => {
                setPriceMin(range.min);
                setPriceCap(range.max);
              }}
              className={`btn ${priceMin === range.min && priceCap === range.max ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              {range.label}
            </button>
          ))}
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

        {mobileFiltersOpen && (
          <div className="card directory-mobile-filters-card" style={{ marginTop: '0.875rem', padding: '1rem' }}>
            {filterPanel}
          </div>
        )}
      </div>

      <div className="container layout-directory pb-32 max-md:pb-36" style={{ paddingBottom: '8rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', marginBottom: '1rem', border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px', color: 'var(--secondary)' }}>view_module</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)' }}>
              Mostrando especialistas primero. Ajusta filtros solo si lo necesitas.
            </p>
          </div>

          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'block', marginBottom: '1rem' }}>progress_activity</span>
              Cargando profesionales...
            </div>
          )}

          {!isLoading && professionals.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', marginBottom: '0.5rem', display: 'block' }}>person_search</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.375rem' }}>Sin especialistas para este filtro</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Prueba con otro filtro o limpia la busqueda para ver mas perfiles.</p>
            </div>
          )}

          <div className="directory-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '1rem' }}>
            {professionals.map((p) => {
              const profilePath = `/profile/${p.id}`;
              const chatPath = `/profile/${p.id}?tab=chat`;
              const reservePath = `/reserva/${p.id}`;
              const displayPrice = Number(p.hourlyRate || p.price || 2000);

              return (
                <div key={p.id} className="pro-card" style={{ width: '100%', minWidth: 0, margin: 0 }}>
                  <Link to={profilePath} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '0.75rem', alignItems: 'flex-start', minWidth: 0 }}>
                      <div className="directory-avatar" style={{ position: 'relative', flex: '0 0 auto' }}>
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

                      <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', margin: 0, lineHeight: 1.3, overflowWrap: 'anywhere' }}>
                            {p.name}
                          </h3>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-tertiary-container)', whiteSpace: 'nowrap' }}>
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>star</span>
                            {Number(p.rating || 0).toFixed(1)}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', fontWeight: 600, margin: 0, overflowWrap: 'anywhere' }}>
                          {p.title || 'Especialista de salud'}
                        </p>

                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.6875rem', color: p.isVerified ? 'var(--secondary)' : '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: p.isVerified ? 'rgba(16,185,129,0.16)' : 'rgba(245,158,11,0.16)' }}>
                            {p.isVerified ? 'Verificado' : 'Perfil en revision'}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '9999px', border: '1px solid var(--outline-variant)' }}>
                            {CATEGORY_MAP[p.category] || CATEGORY_MAP[HEALTH_CATEGORY]}
                          </span>
                        </div>

                        {p.medicalSpecialty && (
                          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--on-surface-variant)' }}>
                            Especialidad: <strong>{MEDICAL_SPECIALTY_LABELS[p.medicalSpecialty] || p.medicalSpecialty}</strong>
                          </p>
                        )}

                        {Array.isArray(p.consultationModes) && p.consultationModes.length > 0 && (
                          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--on-surface-variant)', overflowWrap: 'anywhere' }}>
                            Modalidad: {p.consultationModes.map((mode) => CONSULTATION_MODE_OPTIONS.find((opt) => opt.value === mode)?.label || mode).join(' | ')}
                          </p>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', margin: 0 }}>
                            {Number(p.reviewCount || 0)} resenas
                          </p>
                          <p style={{ fontSize: '0.9375rem', color: 'var(--primary)', fontWeight: 800, margin: 0, whiteSpace: 'nowrap' }}>
                            Desde ${displayPrice.toLocaleString('es-MX')} MXN
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="directory-card-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '0.5rem' }}>
                    <Link to={chatPath} className="btn" style={{ justifyContent: 'center', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '0.8125rem', textDecoration: 'none' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat</span> Mensaje
                    </Link>
                    <Link to={profilePath} className="btn btn-outline" style={{ justifyContent: 'center', fontSize: '0.8125rem', textDecoration: 'none' }}>
                      Ver perfil
                    </Link>
                    <Link to={reservePath} className="btn btn-primary" style={{ justifyContent: 'center', fontSize: '0.8125rem', textDecoration: 'none' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span> Agendar
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="card hide-mobile" style={{ padding: '1.25rem', height: 'fit-content', position: 'sticky', top: '5rem' }}>
          {filterPanel}
        </aside>
      </div>

      <Footer />
    </>
  );
}
