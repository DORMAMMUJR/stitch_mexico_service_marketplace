import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { useToast } from '../components/ToastContext';
import { CATEGORIES } from '../constants/verificationFields';

export function VerificationPage() {
  const [currentStep, setCurrentStep] = useState(0); // 0: Perfil, 1: INE, 2: SAT, 3: CONOCER
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [professionalId, setProfessionalId] = useState(null);
  const [profile, setProfile] = useState(null);

  // Step 0: Profile Form State
  const [profileForm, setProfileForm] = useState({ title: '', category: 'GENERAL_MAINTENANCE', bio: '', hourlyRate: '' });

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Guard: evita que el useEffect sobreescriba el paso cuando el usuario navega manualmente
  const initialLoadDone = useRef(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Helper generico: avanzar al siguiente paso sin hardcodear el numero
  const nextStep = useCallback(() => setCurrentStep(prev => prev + 1), []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      try {
        // CRITICAL FIX: Garantizar que existe el registro Professional antes de leer el perfil.
        // Si el usuario era CLIENT, este endpoint lo crea y actualiza el rol a PROFESSIONAL.
        await fetch('/api/professionals/me/ensure', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const response = await fetch('/api/professionals/me', {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfessionalId(data.id);
          setProfile(data);
          setProfileForm({
            title: data.title || '',
            category: data.category || 'GENERAL_MAINTENANCE',
            bio: data.bio || '',
            hourlyRate: data.hourlyRate || ''
          });

          // Determinar paso solo en la PRIMERA carga, no en navegaciones del usuario entre pasos
          if (!initialLoadDone.current) {
            initialLoadDone.current = true;

            const docs = data.documents || [];
            const hasIne = docs.some(d => d.type === 'INE' || d.type === 'PASSPORT');
            const hasSat = docs.some(d => d.type === 'SAT_CONSTANCIA');

            // hourlyRate puede ser 0 (tarifa gratuita, valido), por eso != null && !== '' en lugar de truthy
            const hasProfile =
              data.title &&
              data.bio &&
              data.hourlyRate != null &&
              data.hourlyRate !== '';

            if (hasProfile) {
              setCurrentStep(1); // Mover al paso opcional si ya tiene perfil
            }
            // else: quedarse en paso 0
          }
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/professionals/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileForm)
      });
      
      if (!response.ok) throw new Error('Error guardando el perfil');
      
      showToast('Perfil guardado exitosamente', 'success');
      nextStep(); // Avanzar al siguiente paso (generico, sin hardcodear numero)
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
    fileInputRef.current.click();
  };

  const uploadDocument = async (docType) => {
    if (!file) return;
    setSubmitting(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('constancia', file);
      formData.append('professionalId', professionalId);
      formData.append('docType', docType);

      const token = localStorage.getItem('token');

      const response = await fetch('/api/verification/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errData.error || 'Error al subir el documento');
      }

      showToast('Documento subido exitosamente', 'success');
      setFile(null); // Limpiar para el siguiente paso
      
      // Ya no hay más pasos obligatorios. Terminamos la verificación.
      await finishVerification();
    } catch (err) {
      setUploadError(err.message || 'Error al subir el documento. Intente de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const finishVerification = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/professionals/me/submit-review', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al enviar perfil a revisión');
      }

      showToast('Perfil enviado a revisión', 'success');
      // Forzar recarga completa para que el AuthProvider actualice el rol de CLIENT a PROFESSIONAL
      window.location.href = '/dashboard';
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
      </div>
    );
  }

  const steps = ['Datos Básicos', 'Identidad (Opcional)'];
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
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', maxWidth: '480px' }}>Complete su perfil para acceder al ecosistema de servicios profesionales de alto nivel en México.</p>
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
                  <input type="text" value={profileForm.title} onChange={e => setProfileForm({...profileForm, title: e.target.value})} className="form-input" placeholder="Ej. Especialista en Seguridad" required />
                </div>
                <div>
                  <label className="text-label-md">Categoría Principal</label>
                  <select value={profileForm.category} onChange={e => setProfileForm({...profileForm, category: e.target.value})} className="form-input" required>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-label-md">Biografía Profesional</label>
                <textarea value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="form-input" placeholder="Describa su experiencia y especialidades..." rows="4" required></textarea>
              </div>

              <div>
                <label className="text-label-md">Tarifa por Hora Estimada (MXN)</label>
                <input type="number" value={profileForm.hourlyRate} onChange={e => setProfileForm({...profileForm, hourlyRate: e.target.value})} className="form-input" placeholder="Ej. 800" min="0" required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Siguiente Paso'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 1: INE / BIOMETRÍA (OPCIONAL) */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--secondary)' }}>verified_user</span>
                <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>Verificación Opcional para Mayor Confianza</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)' }}>Subir tu identificación oficial (INE o Pasaporte) aumentará la confianza de los clientes en tu perfil. Puedes omitir este paso y hacerlo después.</p>

              <div style={{ background: file ? 'rgba(45,188,254,0.03)' : 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: '3rem 2rem', textAlign: 'center', border: file ? '2px dashed var(--secondary)' : '2px dashed transparent' }}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,image/jpeg,image/png,image/webp" />
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: file ? 'var(--secondary)' : 'var(--on-surface-variant)', marginBottom: '1rem', display: 'block' }}>{file ? 'task' : 'upload_file'}</span>
                <p style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>{file ? file.name : 'Seleccionar Documento (Opcional)'}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>PDF, JPG, PNG o WebP · Máximo 5 MB</p>
                <button className={`btn ${file ? 'btn-outline' : 'btn-primary'}`} style={{ marginTop: '1rem' }} onClick={triggerFileSelect}>{file ? 'Cambiar Archivo' : 'Elegir Archivo'}</button>
              </div>

              {uploadError && <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{uploadError}</p>}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button className="btn btn-outline" onClick={() => setCurrentStep(0)}>Atrás</button>
                {file ? (
                  <button className="btn btn-primary" onClick={() => uploadDocument('INE')} disabled={submitting}>
                    {submitting ? 'Subiendo...' : 'Subir y Finalizar'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={finishVerification} style={{ background: '#16a34a', borderColor: '#16a34a' }} disabled={submitting}>
                    {submitting ? 'Finalizando...' : 'Omitir y Finalizar'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}
