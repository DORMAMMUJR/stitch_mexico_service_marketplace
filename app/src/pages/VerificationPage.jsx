import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { CATEGORIES, DEFAULT_PROFESSIONAL_CATEGORY } from '../constants/verificationFields';

export function VerificationPage() {
  const REQUIRED_DOC_TYPES = ['INE', 'CONOCER_CERT'];
  const DOC_LABELS = { INE: 'INE', CONOCER_CERT: 'Cédula profesional' };

  const [currentStep, setCurrentStep] = useState(0); // 0: Perfil, 1: Documentos
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [professionalId, setProfessionalId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [docStatusByType, setDocStatusByType] = useState({ INE: null, CONOCER_CERT: null });
  const [selectedDocType, setSelectedDocType] = useState('INE');

  // Step 0: Profile Form State
  const [profileForm, setProfileForm] = useState({ title: '', category: DEFAULT_PROFESSIONAL_CATEGORY, bio: '', hourlyRate: '' });

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Guard: evita que el useEffect sobreescriba el paso cuando el usuario navega manualmente
  const initialLoadDone = useRef(false);

  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Helper genérico: avanzar al siguiente paso sin hardcodear el número
  const nextStep = useCallback(() => setCurrentStep((prev) => prev + 1), []);

  // Esperar a que useAuth resuelva antes de verificar sesión
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        // Garantizar que existe el registro Professional (crea si era CLIENT)
        await apiFetch('/professionals/me/ensure', { method: 'POST' });

        const data = await apiFetch('/professionals/me');

        setProfessionalId(data.id);
        setProfile(data);
        setProfileForm({
          title: data.title || '',
          category: CATEGORIES[data.category] ? data.category : DEFAULT_PROFESSIONAL_CATEGORY,
          bio: data.bio || '',
          hourlyRate: data.hourlyRate || '',
        });

        const docs = Array.isArray(data.documents) ? data.documents : [];
        const latestStatus = { INE: null, CONOCER_CERT: null };

        REQUIRED_DOC_TYPES.forEach((docType) => {
          const matches = docs
            .filter((doc) => doc.type === docType)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          if (matches.length > 0) latestStatus[docType] = matches[0].status || 'PENDING';
        });

        setDocStatusByType(latestStatus);

        // Determinar paso solo en la PRIMERA carga
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;

          const hasProfile =
            data.title &&
            data.bio &&
            data.hourlyRate != null &&
            data.hourlyRate !== '';

          if (hasProfile) {
            setCurrentStep(1);
          }
        }
      } catch (err) {
        console.error('Error cargando perfil de verificación:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authLoading, isAuthenticated, navigate]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/professionals/me', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      showToast('Perfil guardado exitosamente', 'success');
      nextStep();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        setUploadError('El archivo excede el límite de 5MB.');
        return;
      }
      setFile(selectedFile);
      setUploadError('');
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const uploadDocument = async (docType) => {
    if (!file || !professionalId) return;
    setSubmitting(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('constancia', file);
      formData.append('professionalId', professionalId);
      formData.append('docType', docType);

      // apiFetch detecta FormData y omite Content-Type automáticamente
      await apiFetch('/verification/upload', { method: 'POST', body: formData });

      // Reflejar estado Pendiente inmediatamente (sin esperar recarga)
      setDocStatusByType((prev) => ({ ...prev, [docType]: 'PENDING' }));
      showToast(`${DOC_LABELS[docType]} subida. Estado: Pendiente de revisión`, 'success');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Error al subir el documento. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const finishVerification = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/professionals/me/submit-review', { method: 'POST' });
      showToast('Perfil enviado a revisión. ¡Te notificaremos pronto!', 'success');
      // Forzar recarga para que AuthProvider actualice rol y mostrar feedback de onboarding
      window.location.href = '/directory?welcome=professional';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton mientras useAuth verifica la cookie o la página carga datos
  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
      </div>
    );
  }

  const hasDocReady = (status) => status === 'PENDING' || status === 'APPROVED';
  const allRequiredDocsReady = REQUIRED_DOC_TYPES.every((docType) => hasDocReady(docStatusByType[docType]));

  const steps = ['Datos Básicos', 'INE + Cédula'];
  const progressPercent = Math.round(((currentStep + 1) / 2) * 100);

  return (
    <>
      <header className="nav-top">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.5rem' }}>
          <Link to="/" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none' }}>Intecnia</Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Entorno Seguro
          </span>
        </div>
      </header>

      <div className="container" style={{ padding: '2.5rem 1.5rem 4rem', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Proceso de Certificación Institucional</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', maxWidth: '480px' }}>Completa tu perfil para integrarte al ecosistema health-first de Psicologia, Medicina y Bienestar.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>PROGRESO GENERAL</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--secondary)' }}>{progressPercent}% Completado</p>
            </div>
          </div>
        </div>

        {/* Progress Steps Indicator */}
        <div style={{ display: 'flex', marginBottom: '3rem', position: 'relative' }}>
          {steps.map((step, i) => (
            <div key={step} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{ height: '4px', background: i <= currentStep ? 'var(--secondary)' : 'var(--surface-container)', marginBottom: '0.75rem', borderRadius: i === 0 ? '4px 0 0 4px' : i === steps.length - 1 ? '0 4px 4px 0' : '' }}></div>
              <span style={{ fontSize: '0.8125rem', fontWeight: i === currentStep ? 700 : 500, color: i <= currentStep ? 'var(--secondary)' : 'var(--on-surface-variant)' }}>{step}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {/* STEP 0: PERFIL */}
          {currentStep === 0 && (
            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--secondary)' }}>person</span>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>Datos del Perfil</h2>
              </div>

              <div className="grid-2">
                <div>
                  <label className="text-label-md">Título Profesional</label>
                  <input type="text" value={profileForm.title} onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })} className="form-input" placeholder="Ej. Psicologa clinica" required />
                </div>
                <div>
                  <label className="text-label-md">Area health-first</label>
                  <select value={profileForm.category} onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })} className="form-input" required>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-label-md">Biografía Profesional</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} className="form-input" placeholder="Describe tu experiencia clinica, medica o de bienestar..." rows="4" required></textarea>
              </div>

              <div>
                <label className="text-label-md">Tarifa por Hora Estimada (MXN)</label>
                <input type="number" value={profileForm.hourlyRate} onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })} className="form-input" placeholder="Ej. 800" min="0" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Siguiente Paso'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 1: INE + CÉDULA (REQUERIDO) */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--secondary)' }}>verified_user</span>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>Verificación de Identidad Profesional</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)' }}>
                Debes subir ambos documentos para pasar a revisión: <strong>INE</strong> y <strong>Cédula profesional</strong>.
              </p>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {REQUIRED_DOC_TYPES.map((docType) => {
                  const status = docStatusByType[docType];
                  const ready = hasDocReady(status);
                  const approved = status === 'APPROVED';
                  return (
                    <div
                      key={docType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${ready ? 'rgba(16,185,129,0.3)' : 'var(--outline-variant)'}`,
                        background: ready ? 'rgba(16,185,129,0.08)' : 'var(--surface-container-low)',
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 600 }}>{DOC_LABELS[docType]}</p>
                      <span style={{ fontSize: '0.8125rem', color: approved ? '#10b981' : ready ? '#f59e0b' : 'var(--on-surface-variant)', fontWeight: 700 }}>
                        {approved ? 'APROBADO' : ready ? 'EN REVISIÓN' : 'PENDIENTE'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <label className="text-label-md">Tipo de documento a subir</label>
                <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} className="form-input">
                  {REQUIRED_DOC_TYPES.map((docType) => (
                    <option key={docType} value={docType}>{DOC_LABELS[docType]}</option>
                  ))}
                </select>
              </div>

              <div style={{ background: file ? 'rgba(45,188,254,0.03)' : 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: '3rem 2rem', textAlign: 'center', border: file ? '2px dashed var(--secondary)' : '2px dashed transparent' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,image/jpeg,image/png,image/webp" />
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: file ? 'var(--secondary)' : 'var(--on-surface-variant)', marginBottom: '1rem', display: 'block' }}>{file ? 'task' : 'upload_file'}</span>
                <p style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>{file ? file.name : `Seleccionar archivo para ${DOC_LABELS[selectedDocType]}`}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>PDF, JPG, PNG o WebP · Máximo 5 MB</p>
                <button type="button" className={`btn ${file ? 'btn-outline' : 'btn-primary'}`} style={{ marginTop: '1rem' }} onClick={triggerFileSelect}>{file ? 'Cambiar Archivo' : 'Elegir Archivo'}</button>
              </div>

              {uploadError && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{uploadError}</p>}

              {!allRequiredDocsReady && (
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                  Falta completar ambos documentos para enviar tu perfil a revisión.
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(0)}>Atrás</button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-primary" onClick={() => uploadDocument(selectedDocType)} disabled={submitting || !file}>
                    {submitting ? 'Subiendo...' : `Subir ${DOC_LABELS[selectedDocType]}`}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={finishVerification} style={{ background: '#16a34a', borderColor: '#16a34a' }} disabled={submitting || !allRequiredDocsReady}>
                    {submitting ? 'Enviando...' : 'Enviar a revisión'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
