import React from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';

export function VerificationPage() {
  const [file, setFile] = React.useState(null);
  const [uploadState, setUploadState] = React.useState('idle'); // idle | uploading | success | error
  const [uploadResult, setUploadResult] = React.useState(null);
  const [uploadError, setUploadError] = React.useState('');
  const fileInputRef = React.useRef(null);

  // TODO: En producción, obtener del JWT / contexto de auth
  const professionalId = 'prof-pamela-001';

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validación de tamaño en frontend (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setUploadError('El archivo excede el límite de 5MB.');
        return;
      }

      setFile(selectedFile);
      setUploadState('idle');
      setUploadError('');
      setUploadResult(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadState('uploading');
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('constancia', file);
      formData.append('professionalId', professionalId);
      formData.append('docType', 'SAT_CONSTANCIA');

      const response = await fetch('/api/verification/upload', {
        method: 'POST',
        body: formData,
        // No Content-Type header — browser sets multipart boundary automatically
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Error de red' }));
        throw new Error(errData.error || 'Error al subir el documento');
      }

      const result = await response.json();
      setUploadResult(result);
      setUploadState('success');
    } catch (err) {
      setUploadError(err.message || 'Error al subir el documento. Intente de nuevo.');
      setUploadState('error');
    }
  };

  const progressPercent = uploadState === 'success' ? 85 : file ? 75 : 65;
  const currentStep = uploadState === 'success' ? 3 : file ? 3 : 2;

  return (
    <>
      {/* Minimal Nav */}
      <header className="nav-top">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.5rem' }}>
          <Link to="/" style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'none' }}>Intecnia</Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span> Entorno Seguro
          </span>
        </div>
      </header>

      <div className="container" style={{ padding: '2.5rem 1.5rem 4rem', maxWidth: '960px' }}>
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
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '3px solid var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(45,188,254,0.05)' }}>
              <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--secondary)', fontSize: '20px' }}>{uploadState === 'success' ? 'check_circle' : file ? 'pending' : 'pending'}</span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', marginBottom: '3rem', position: 'relative' }}>
          {['Perfil', 'Biometría', 'SAT & Fiscal', 'CONOCER'].map((step, i) => (
            <div key={step} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              <div style={{ height: '3px', background: i < currentStep ? 'var(--secondary)' : 'var(--surface-container)', marginBottom: '0.75rem', borderRadius: i === 0 ? '4px 0 0 4px' : i === 3 ? '0 4px 4px 0' : '' }}></div>
              <span style={{ fontSize: '0.8125rem', fontWeight: i === currentStep ? 600 : 500, color: i < currentStep ? 'var(--secondary)' : 'var(--on-surface-variant)' }}>{step}</span>
            </div>
          ))}
        </div>

        <div className="grid-sidebar-right">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Biometric Identity */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(45,188,254,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>photo_camera_front</span>
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>Identidad Biométrica</h2>
                </div>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Utilizamos tecnología de grado bancario para validar su identidad mediante reconocimiento facial y cotejo de INE/Pasaporte.</p>
              <div className="grid-2">
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>badge</span>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>INE / Pasaporte</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}><span className="material-symbols-outlined icon-filled" style={{ fontSize: '12px' }}>check_circle</span> Validado</span>
                </div>
                <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center', border: '1px solid rgba(45,188,254,0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--secondary)', marginBottom: '0.5rem', display: 'block' }}>photo_camera</span>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Captura Facial Liveness</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}><span className="material-symbols-outlined icon-filled" style={{ fontSize: '12px' }}>check_circle</span> Completado</span>
                </div>
              </div>
            </div>

            {/* SAT Fiscal */}
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(231,83,29,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>account_balance</span>
                  </div>
                  <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>Situación Fiscal (SAT)</h2>
                </div>
                <span style={{ background: 'var(--on-tertiary-container)', color: 'var(--on-primary)', fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-md)' }}>OBLIGATORIO</span>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Validación de Constancia de Situación Fiscal y cumplimiento ante el SAT para emisión de facturas institucionales.</p>

              <div style={{ background: file ? 'rgba(45,188,254,0.03)' : 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', border: file ? '2px dashed var(--secondary)' : '2px dashed transparent', transition: 'all 0.3s' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  accept=".pdf"
                />
                <span className="material-symbols-outlined" style={{ fontSize: '36px', color: file ? 'var(--secondary)' : 'var(--on-surface-variant)', marginBottom: '0.75rem', display: 'block' }}>{file ? 'task' : 'upload_file'}</span>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{file ? file.name : 'Cargar Constancia de Situación Fiscal'}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '1.25rem' }}>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF original (no mayor a 3 meses de antigüedad). Max 5MB.'}</p>
                <button 
                  className={`btn ${file ? 'btn-outline' : 'btn-primary'}`} 
                  style={{ borderRadius: 'var(--radius-lg)' }}
                  onClick={triggerFileSelect}
                  disabled={uploadState === 'uploading'}
                >
                  {file ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                </button>
              </div>

              {/* Upload error message */}
              {uploadError && (
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>error</span>
                  <p style={{ fontSize: '0.8125rem', color: '#dc2626' }}>{uploadError}</p>
                </div>
              )}

              {/* Upload success message */}
              {uploadState === 'success' && uploadResult && (
                <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: '18px', color: '#16a34a' }}>check_circle</span>
                  <div>
                    <p style={{ fontSize: '0.8125rem', color: '#16a34a', fontWeight: 600 }}>{uploadResult.message}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>ID: {uploadResult.id}</p>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)', marginBottom: '0.125rem' }}>ESTADO ACTUAL</p>
                  <p style={{ fontWeight: 500, fontSize: '0.875rem', color: uploadState === 'success' ? '#16a34a' : file ? 'var(--secondary)' : 'inherit' }}>
                    {uploadState === 'success' ? 'Documento enviado — Pendiente de revisión' : file ? 'Documento listo para envío' : 'Pendiente de carga de documento'}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: uploadState === 'success' ? '#16a34a' : 'var(--secondary)' }}>
                  {uploadState === 'success' ? 'verified' : file ? 'check_circle' : 'info'}
                </span>
              </div>
            </div>

            {/* CONOCER Certifications */}
            <div style={{ borderLeft: '3px solid var(--secondary)', paddingLeft: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(45,188,254,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>workspace_premium</span>
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)' }}>Certificaciones CONOCER</h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Acredite sus competencias laborales para obtener el distintivo de "Profesional Verificado" en el directorio.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { code: 'EC0217.01', desc: 'Impartición de cursos de formación del capital humano' },
                  { code: 'EC0301', desc: 'Diseño de cursos de formación del capital humano' },
                ].map(cert => (
                  <div key={cert.code} style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--ambient-shadow)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>description</span>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cert.code}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>{cert.desc}</p>
                      </div>
                    </div>
                    <Link to="#" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>Vincular <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span></Link>
                  </div>
                ))}
                <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--on-surface-variant)', fontSize: '0.875rem', padding: '0.75rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background='var(--surface-container)'} onMouseOut={(e) => e.currentTarget.style.background='var(--surface-container-low)'}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> Agregar otra certificación oficial
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '5rem', height: 'fit-content' }}>
            {/* Privacy Protocol */}
            <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', color: 'var(--on-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary-container)' }}>security</span>
              </div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem' }}>Protocolo de Privacidad Digital</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--primary-fixed-dim)', lineHeight: 1.6, marginBottom: '1rem' }}>
                En Intecnia, sus datos están encriptados bajo el estándar AES-256. La información compartida es estrictamente para fines de verificación institucional y cumplimiento normativo.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['Cumplimiento Ley Federal de Datos', 'Infraestructura de Grado Militar', 'Auditado por Entidades Reguladoras'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-fixed-dim)' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: '12px', color: 'var(--secondary-container)' }}>check_circle</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Validated By */}
            <div>
              <p className="text-label-md" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>VALIDADO POR</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['GOB MÉXICO', 'SAT', 'CONOCER', 'ISO 27001'].map(org => (
                  <span key={org} style={{ background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 500, color: 'var(--on-surface-variant)' }}>{org}</span>
                ))}
              </div>
            </div>

            {/* Support Chat */}
            <div style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', boxShadow: 'var(--ambient-shadow)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=50&h=50&fit=crop&crop=face" alt="Support" style={{ width: '2.75rem', height: '2.75rem', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>¿Necesita asistencia?</p>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Chat con Soporte Elite</p>
                <span style={{ fontSize: '0.6875rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--secondary)' }}></span> En línea ahora
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <Link to="#" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--on-surface-variant)', fontSize: '0.875rem', textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Guardar y continuar más tarde
          </Link>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.75rem 2rem', borderRadius: 'var(--radius-lg)', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleUpload}
            disabled={!file || uploadState === 'uploading' || uploadState === 'success'}
          >
            {uploadState === 'uploading' ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                Subiendo...
              </>
            ) : uploadState === 'success' ? (
              <>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '18px' }}>check_circle</span>
                Enviado
              </>
            ) : (
              <>
                Finalizar Verificación <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
              </>
            )}
          </button>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
