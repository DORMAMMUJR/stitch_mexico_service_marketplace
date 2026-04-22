import { navbarKonectia, footer, trustBar } from '../components.js';

export function renderCategories() {
  const categories = [
    { icon: 'health_and_safety', name: 'Salud y Bienestar', desc: 'Consultoría médica, fisioterapia y especialistas en salud integral con cédula profesional.', count: '856 Expertos', color: 'var(--secondary)' },
    { icon: 'devices', name: 'Servicios Digitales', desc: 'Desarrollo de software, marketing digital y transformación tecnológica para negocios.', count: '2,105 Expertos', color: 'var(--secondary)' },
    { icon: 'school', name: 'Educación', desc: 'Tutorías académicas, capacitación corporativa y enseñanza de idiomas certificados.', count: '642 Expertos', color: 'var(--secondary)' },
    { icon: 'gavel', name: 'Legal y Fiscal', desc: 'Asesoría jurídica, contabilidad y cumplimiento fiscal para personas físicas y morales.', count: '420 Expertos', color: 'var(--secondary)' },
  ];

  return `
  ${navbarKonectia('categories')}

  <!-- Hero Banner -->
  <section style="margin:1.5rem;border-radius:var(--radius-xl);overflow:hidden;background:var(--primary);position:relative;padding:3rem 2.5rem;display:flex;flex-wrap:wrap;gap:2rem;align-items:center;">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at top right,var(--primary-container),var(--primary));opacity:0.9;"></div>
    <div style="position:relative;z-index:1;flex:1;min-width:280px;">
      <span style="display:inline-block;background:var(--secondary);color:var(--on-secondary);font-size:0.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;padding:0.25rem 0.75rem;border-radius:var(--radius-md);margin-bottom:1rem;">EXPLORAR</span>
      <h1 style="font-family:'Manrope';font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;color:var(--on-primary);line-height:1.1;margin-bottom:1rem;">
        Encuentra la<br>Institución<br><em style="font-style:italic;color:var(--primary-fixed-dim);">Adecuada para Ti.</em>
      </h1>
      <p style="color:var(--primary-fixed-dim);font-size:0.9375rem;max-width:400px;margin-bottom:1.5rem;line-height:1.6;">
        Accede a nuestro directorio de expertos verificados bajo los más altos estándares de calidad y cumplimiento institucional.
      </p>
      <a data-route="/directory" class="btn" style="background:var(--secondary);color:var(--on-secondary);border-radius:var(--radius-lg);padding:0.75rem 1.5rem;">
        Explorar Servicios <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
      </a>
    </div>
    <div style="position:relative;z-index:1;flex:0 0 auto;max-width:320px;border-radius:var(--radius-lg);overflow:hidden;">
      <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop" alt="Professional building" style="width:100%;height:220px;object-fit:cover;border-radius:var(--radius-lg);" />
    </div>
  </section>

  <!-- Categories Section -->
  <section class="container" style="padding:3rem 1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h2 class="text-headline-md" style="color:var(--primary);margin-bottom:0.25rem;">Categorías de Servicio</h2>
        <p style="color:var(--on-surface-variant);font-size:0.875rem;">Soluciones profesionales segmentadas por especialidad técnica y académica.</p>
      </div>
      <div style="display:flex;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--outline-variant);">
        <button data-view-toggle class="active-toggle" style="padding:0.375rem 1rem;font-size:0.8125rem;font-weight:500;background:var(--surface-container-lowest);color:var(--on-surface);">Cuadrícula</button>
        <button data-view-toggle style="padding:0.375rem 1rem;font-size:0.8125rem;font-weight:500;background:transparent;color:var(--on-surface-variant);">Lista</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.25rem;">
      <!-- Featured Large Card -->
      <div style="grid-row:span 2;border-radius:var(--radius-xl);overflow:hidden;position:relative;min-height:420px;cursor:pointer;" data-route="/directory">
        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&h=600&fit=crop" alt="Mantenimiento" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,3,10,0.85) 30%,transparent 70%);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;padding:1.5rem;color:var(--on-primary);z-index:1;">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
            <span class="material-symbols-outlined" style="font-size:16px;">construction</span>
            <span style="background:var(--secondary);color:var(--on-secondary);font-size:0.625rem;padding:0.125rem 0.5rem;border-radius:var(--radius-md);text-transform:uppercase;font-weight:600;">POPULAR</span>
          </div>
          <h3 style="font-family:'Manrope';font-weight:700;font-size:1.375rem;margin-bottom:0.375rem;">Mantenimiento y Oficios</h3>
          <p style="font-size:0.8125rem;color:var(--primary-fixed-dim);line-height:1.5;margin-bottom:1rem;">Servicios especializados para infraestructuras residenciales e industriales con garantía de ejecución.</p>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="display:flex;align-items:center;gap:0.375rem;font-size:0.8125rem;font-weight:500;">
              <span class="material-symbols-outlined icon-filled" style="font-size:14px;color:var(--secondary-container);">verified</span>
              1,240 Expertos Verificados
            </span>
            <span style="width:2rem;height:2rem;border-radius:50%;background:var(--secondary);display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:16px;color:var(--on-secondary);">arrow_outward</span>
            </span>
          </div>
        </div>
      </div>

      ${categories.map(cat => `
      <div class="cat-card" data-route="/directory" style="cursor:pointer;display:flex;flex-direction:column;gap:0.75rem;">
        <div class="cat-icon" style="background:rgba(0,101,141,0.08);color:${cat.color};">
          <span class="material-symbols-outlined">${cat.icon}</span>
        </div>
        <h3 style="font-family:'Manrope';font-weight:700;font-size:1.0625rem;color:var(--primary);">${cat.name}</h3>
        <p style="color:var(--on-surface-variant);font-size:0.8125rem;line-height:1.5;flex:1;">${cat.desc}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:0.5rem;">
          <span style="font-size:0.8125rem;font-weight:600;color:var(--secondary);">${cat.count}</span>
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--on-surface-variant);">chevron_right</span>
        </div>
      </div>
      `).join('')}
    </div>

    <!-- Events Card -->
    <div style="margin-top:1.25rem;border-radius:var(--radius-xl);overflow:hidden;position:relative;height:180px;cursor:pointer;max-width:50%;" data-route="/directory">
      <img src="https://images.unsplash.com/photo-1540575467063-178a50da2fd8?w=600&h=250&fit=crop" alt="Eventos" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(0,3,10,0.8) 50%,transparent);"></div>
      <div style="position:absolute;bottom:1.25rem;left:1.5rem;color:var(--on-primary);z-index:1;">
        <h3 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;margin-bottom:0.25rem;">Eventos y Producción</h3>
        <p style="font-size:0.8125rem;color:var(--primary-fixed-dim);margin-bottom:0.75rem;">Planificación logística y técnica para eventos de alto impacto institucional.</p>
        <div style="display:flex;align-items:center;gap:1rem;">
          <span style="font-size:0.8125rem;font-weight:600;">312 Expertos</span>
          <span style="background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);padding:0.25rem 0.75rem;border-radius:var(--radius-md);font-size:0.75rem;font-weight:500;">Ver Directorio</span>
        </div>
      </div>
    </div>
  </section>

  ${trustBar()}
  ${footer()}
  `;
}
