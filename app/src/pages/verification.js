import { footer } from '../components.js';

export function renderVerification() {
  return `
  <!-- Minimal Nav -->
  <header class="nav-top">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:3.5rem;">
      <a data-route="/" style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);cursor:pointer;">KonectIA</a>
      <span style="display:flex;align-items:center;gap:0.375rem;font-size:0.8125rem;color:var(--on-surface-variant);background:var(--surface-container-low);padding:0.375rem 0.75rem;border-radius:var(--radius-md);">
        <span class="material-symbols-outlined" style="font-size:14px;">lock</span> Entorno Seguro
      </span>
    </div>
  </header>

  <div class="container" style="padding:2.5rem 1.5rem 4rem;max-width:960px;">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 style="font-family:'Manrope';font-size:1.75rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem;">Proceso de Certificación Institucional</h1>
        <p style="color:var(--on-surface-variant);font-size:0.9375rem;max-width:480px;">Complete su perfil para acceder al ecosistema de servicios profesionales de alto nivel en México.</p>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;">
        <div>
          <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);">PROGRESO GENERAL</p>
          <p style="font-size:1.125rem;font-weight:700;color:var(--secondary);">65% Completado</p>
        </div>
        <div style="width:3rem;height:3rem;border-radius:50%;border:3px solid var(--secondary);display:flex;align-items:center;justify-content:center;background:rgba(45,188,254,0.05);">
          <span class="material-symbols-outlined icon-filled" style="color:var(--secondary);font-size:20px;">check_circle</span>
        </div>
      </div>
    </div>

    <!-- Progress Steps -->
    <div style="display:flex;margin-bottom:3rem;position:relative;">
      ${['Perfil','Biometría','SAT & Fiscal','CONOCER'].map((step, i) => `
      <div style="flex:1;text-align:center;position:relative;">
        <div style="height:3px;background:${i < 3 ? 'var(--secondary)' : 'var(--surface-container)'};margin-bottom:0.75rem;${i === 0 ? 'border-radius:4px 0 0 4px;' : i === 3 ? 'border-radius:0 4px 4px 0;' : ''}"></div>
        <span style="font-size:0.8125rem;font-weight:${i === 2 ? '600' : '500'};color:${i === 2 ? 'var(--secondary)' : i < 2 ? 'var(--secondary)' : 'var(--on-surface-variant)'};">${step}</span>
      </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:2rem;">
      <!-- Left Column -->
      <div style="display:flex;flex-direction:column;gap:2rem;">
        <!-- Biometric Identity -->
        <div class="card" style="padding:2rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);background:rgba(45,188,254,0.08);display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="color:var(--secondary);">photo_camera_front</span>
            </div>
            <div>
              <h2 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);">Identidad Biométrica</h2>
            </div>
          </div>
          <p style="color:var(--on-surface-variant);font-size:0.875rem;margin-bottom:1.5rem;">Utilizamos tecnología de grado bancario para validar su identidad mediante reconocimiento facial y cotejo de INE/Pasaporte.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div style="background:var(--surface-container-low);border-radius:var(--radius-lg);padding:1.25rem;text-align:center;">
              <span class="material-symbols-outlined" style="font-size:28px;color:var(--primary);margin-bottom:0.5rem;display:block;">badge</span>
              <p style="font-weight:500;font-size:0.875rem;margin-bottom:0.25rem;">INE / Pasaporte</p>
              <span style="font-size:0.75rem;color:var(--secondary);display:flex;align-items:center;justify-content:center;gap:0.25rem;"><span class="material-symbols-outlined icon-filled" style="font-size:12px;">check_circle</span> Validado</span>
            </div>
            <div style="background:var(--surface-container-low);border-radius:var(--radius-lg);padding:1.25rem;text-align:center;border:1px solid rgba(45,188,254,0.2);">
              <span class="material-symbols-outlined" style="font-size:28px;color:var(--secondary);margin-bottom:0.5rem;display:block;">photo_camera</span>
              <p style="font-weight:500;font-size:0.875rem;margin-bottom:0.25rem;">Captura Facial Liveness</p>
              <span style="font-size:0.75rem;color:var(--on-surface-variant);">Requiere cámara activa</span>
            </div>
          </div>
        </div>

        <!-- SAT Fiscal -->
        <div class="card" style="padding:2rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);background:rgba(231,83,29,0.08);display:flex;align-items:center;justify-content:center;">
                <span class="material-symbols-outlined" style="color:var(--on-tertiary-container);">account_balance</span>
              </div>
              <h2 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);">Situación Fiscal (SAT)</h2>
            </div>
            <span style="background:var(--on-tertiary-container);color:var(--on-primary);font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:0.25rem 0.625rem;border-radius:var(--radius-md);">OBLIGATORIO</span>
          </div>
          <p style="color:var(--on-surface-variant);font-size:0.875rem;margin-bottom:1.5rem;">Validación de Constancia de Situación Fiscal y cumplimiento ante el SAT para emisión de facturas institucionales.</p>

          <div style="background:var(--surface-container-low);border-radius:var(--radius-xl);padding:2rem;text-align:center;margin-bottom:1.5rem;">
            <span class="material-symbols-outlined" style="font-size:36px;color:var(--on-surface-variant);margin-bottom:0.75rem;display:block;">upload_file</span>
            <p style="font-weight:600;font-size:0.9375rem;margin-bottom:0.25rem;">Cargar Constancia de Situación Fiscal</p>
            <p style="font-size:0.75rem;color:var(--on-surface-variant);margin-bottom:1.25rem;">PDF original (no mayor a 3 meses de antigüedad). Max 5MB.</p>
            <button class="btn btn-primary" style="border-radius:var(--radius-lg);">Seleccionar Archivo</button>
          </div>

          <div style="background:var(--surface-container-low);border-radius:var(--radius-lg);padding:1rem;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.05em;color:var(--on-surface-variant);margin-bottom:0.125rem;">ÚLTIMA VALIDACIÓN</p>
              <p style="font-weight:500;font-size:0.875rem;">Pendiente de carga de documento</p>
            </div>
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--secondary);">info</span>
          </div>
        </div>

        <!-- CONOCER Certifications -->
        <div style="border-left:3px solid var(--secondary);padding-left:1.5rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);background:rgba(45,188,254,0.08);display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="color:var(--secondary);">workspace_premium</span>
            </div>
            <div>
              <h2 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);">Certificaciones CONOCER</h2>
              <p style="font-size:0.8125rem;color:var(--on-surface-variant);">Acredite sus competencias laborales para obtener el distintivo de "Profesional Verificado" en el directorio.</p>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:0.75rem;">
            ${[
              { code: 'EC0217.01', desc: 'Impartición de cursos de formación del capital humano' },
              { code: 'EC0301', desc: 'Diseño de cursos de formación del capital humano' },
            ].map(cert => `
            <div style="background:var(--surface-container-lowest);border-radius:var(--radius-lg);padding:1rem;display:flex;justify-content:space-between;align-items:center;box-shadow:var(--ambient-shadow);">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <span class="material-symbols-outlined" style="font-size:18px;color:var(--on-surface-variant);">description</span>
                <div>
                  <p style="font-weight:600;font-size:0.875rem;">${cert.code}</p>
                  <p style="font-size:0.75rem;color:var(--on-surface-variant);">${cert.desc}</p>
                </div>
              </div>
              <a href="#" style="font-size:0.8125rem;font-weight:600;color:var(--secondary);display:flex;align-items:center;gap:0.25rem;">Vincular <span class="material-symbols-outlined" style="font-size:14px;">arrow_forward</span></a>
            </div>`).join('')}
            <button style="display:flex;align-items:center;gap:0.5rem;color:var(--on-surface-variant);font-size:0.875rem;padding:0.75rem;background:var(--surface-container-low);border-radius:var(--radius-lg);justify-content:center;transition:background 0.2s;" onmouseover="this.style.background='var(--surface-container)'" onmouseout="this.style.background='var(--surface-container-low)'">
              <span class="material-symbols-outlined" style="font-size:18px;">add</span> Agregar otra certificación oficial
            </button>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div style="display:flex;flex-direction:column;gap:1.5rem;position:sticky;top:5rem;height:fit-content;">
        <!-- Privacy Protocol -->
        <div style="background:var(--primary);border-radius:var(--radius-xl);padding:1.5rem;color:var(--on-primary);">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--secondary-container);">security</span>
          </div>
          <h3 style="font-family:'Manrope';font-weight:700;font-size:1rem;margin-bottom:0.75rem;">Protocolo de Privacidad Digital</h3>
          <p style="font-size:0.8125rem;color:var(--primary-fixed-dim);line-height:1.6;margin-bottom:1rem;">
            En KonectIA, sus datos están encriptados bajo el estándar AES-256. La información compartida es estrictamente para fines de verificación institucional y cumplimiento normativo.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            ${['Cumplimiento Ley Federal de Datos','Infraestructura de Grado Militar','Auditado por Entidades Reguladoras'].map(item =>
              `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--primary-fixed-dim);">
                <span class="material-symbols-outlined icon-filled" style="font-size:12px;color:var(--secondary-container);">check_circle</span> ${item}
              </div>`
            ).join('')}
          </div>
        </div>

        <!-- Validated By -->
        <div>
          <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.1em;color:var(--on-surface-variant);margin-bottom:0.75rem;">VALIDADO POR</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
            ${['GOB MÉXICO','SAT','CONOCER','ISO 27001'].map(org =>
              `<span style="background:var(--surface-container-low);padding:0.5rem;border-radius:var(--radius-md);text-align:center;font-size:0.75rem;font-weight:500;color:var(--on-surface-variant);">${org}</span>`
            ).join('')}
          </div>
        </div>

        <!-- Support Chat -->
        <div style="background:var(--surface-container-lowest);border-radius:var(--radius-xl);padding:1.25rem;box-shadow:var(--ambient-shadow);display:flex;align-items:center;gap:0.75rem;">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=50&h=50&fit=crop&crop=face" alt="Support" style="width:2.75rem;height:2.75rem;border-radius:50%;object-fit:cover;" />
          <div>
            <p style="font-size:0.75rem;color:var(--on-surface-variant);">¿Necesita asistencia?</p>
            <p style="font-weight:600;font-size:0.875rem;">Chat con Soporte Elite</p>
            <span style="font-size:0.6875rem;color:var(--secondary);display:flex;align-items:center;gap:0.25rem;">
              <span style="width:5px;height:5px;border-radius:50%;background:var(--secondary);"></span> En línea ahora
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3rem;padding-top:2rem;border-top:1px solid rgba(0,0,0,0.04);">
      <a href="#" style="display:flex;align-items:center;gap:0.375rem;color:var(--on-surface-variant);font-size:0.875rem;">
        <span class="material-symbols-outlined" style="font-size:16px;">arrow_back</span> Guardar y continuar más tarde
      </a>
      <button class="btn btn-primary" style="padding:0.75rem 2rem;border-radius:var(--radius-lg);font-size:0.9375rem;">
        Finalizar Verificación <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
      </button>
    </div>
  </div>

  ${footer()}
  `;
}
