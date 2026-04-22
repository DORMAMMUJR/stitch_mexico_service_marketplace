import { navbarKonectia, footer } from '../components.js';

export function renderDirectory() {
  const professionals = [
    { name: 'Roberto Méndez', title: 'MASTER PLUMBER • PREMIUM', jobs: 142, exp: '8y', rating: 4.9, desc: 'Expert en sistemas hidroneumáticos y fugas críticas. Respuesta rápida en toda el área de Zapopan. Certificado...', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBrwPmE9CoFFSgITGHpmV4gf3JXz5_d_KKsl3NpeD-gLu8Q0a0xTgEbSzkqZKlxU8gKQvVptrjClTG2PI8cYgiAZEq1TPchX9BJvojFC6KI93Onksd5UPL3z2FPpQ-8J8Jd6sf0NQdVoF523XtpDfak4CWHO1OqI_36cvxI6IsAZD_ijxR9SnWdbug6vb__VCyf86_XVn4P4HLLepW7PJsJKygS9vFiSLJLTUZl1Z_KCY4hkMdOyIQFNQDXXS8FD8zmxRarlYif8hhq', tier: 'premium' },
    { name: 'Lucía Gutiérrez', title: 'INSTALACIONES SANITARIAS • STANDARD', jobs: 89, exp: '5y', rating: 4.7, desc: 'Especialista en remodelaciones de baños y cocinas. Trabajo garantizado y presupuestos sin compromiso en la zona...', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face', tier: 'standard' },
    { name: 'Jorge Hernández', title: 'INDUSTRIAL PLUMBING • PREMIUM', jobs: 210, exp: '15y', rating: 5.0, desc: 'Servicio institucional para comercios y residencias de alto nivel. Especialista en calderas y sistemas de presión...', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', tier: 'premium' },
    { name: 'Sandra Ortiz', title: 'DOMESTIC MAINTENANCE • STANDARD', jobs: 65, exp: '3y', rating: 4.8, desc: 'Mantenimiento preventivo y correctivo. Rapidez y honestidad. Atención personalizada para departamentos...', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face', tier: 'standard' },
  ];

  return `
  ${navbarKonectia('directory')}

  <!-- Breadcrumb -->
  <div class="container" style="padding:1rem 1.5rem;">
    <nav style="font-size:0.75rem;color:var(--on-surface-variant);display:flex;align-items:center;gap:0.375rem;text-transform:uppercase;letter-spacing:0.05em;">
      <a data-route="/" style="cursor:pointer;">HOME</a>
      <span class="material-symbols-outlined" style="font-size:14px;">chevron_right</span>
      <a data-route="/categories" style="cursor:pointer;">DIRECTORY</a>
      <span class="material-symbols-outlined" style="font-size:14px;">chevron_right</span>
      <span style="font-weight:600;color:var(--on-surface);">SEARCH RESULTS</span>
    </nav>
  </div>

  <!-- Search Header -->
  <div class="container" style="padding:0 1.5rem 1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <div>
        <h1 style="font-family:'Manrope';font-weight:700;font-size:1.25rem;color:var(--primary);margin-bottom:0.25rem;">Plomeros urgentes en Zapopan</h1>
        <p style="font-size:0.875rem;color:var(--on-surface-variant);">14 verified professionals found near your location</p>
      </div>
      <button class="btn btn-outline" style="font-size:0.8125rem;">
        <span class="material-symbols-outlined" style="font-size:16px;">tune</span>
        Sort by: Recommended
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container" style="padding:0 1.5rem 3rem;display:grid;grid-template-columns:240px 1fr;gap:1.5rem;">
    <!-- Filters Sidebar -->
    <aside class="card hide-mobile" style="padding:1.5rem;height:fit-content;position:sticky;top:5rem;">
      <h3 style="font-family:'Manrope';font-weight:700;font-size:1.0625rem;color:var(--secondary);margin-bottom:1.5rem;">Filters</h3>

      <div style="margin-bottom:1.5rem;">
        <label class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);display:block;margin-bottom:0.5rem;">CATEGORY</label>
        <select style="width:100%;padding:0.5rem;background:var(--surface-container-low);border-radius:var(--radius-md);font-size:0.8125rem;color:var(--on-surface);">
          <option>Plumbing & Pipes</option>
          <option>Electrical</option>
          <option>HVAC</option>
        </select>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);display:block;margin-bottom:0.5rem;">PRICE RANGE (MXN)</label>
        <input type="range" min="200" max="5000" value="1500" style="width:100%;accent-color:var(--secondary);" />
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--on-surface-variant);margin-top:0.25rem;">
          <span>$200</span><span>$5,000+</span>
        </div>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);display:block;margin-bottom:0.5rem;">MINIMUM RATING</label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;margin-bottom:0.375rem;cursor:pointer;">
          <input type="radio" name="rating" style="accent-color:var(--secondary);" /> 4.5+ Stars
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;cursor:pointer;">
          <input type="radio" name="rating" style="accent-color:var(--secondary);" /> 4.0+ Stars
        </label>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);display:block;margin-bottom:0.5rem;">VERIFICATION LEVEL</label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;margin-bottom:0.375rem;cursor:pointer;">
          <span class="material-symbols-outlined icon-filled" style="font-size:16px;color:var(--secondary);">verified</span>
          Premium <input type="checkbox" style="margin-left:auto;accent-color:var(--secondary);" />
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;cursor:pointer;">
          <span class="material-symbols-outlined icon-filled" style="font-size:16px;color:var(--on-surface-variant);">verified</span>
          Standard <input type="checkbox" style="margin-left:auto;accent-color:var(--secondary);" />
        </label>
      </div>

      <div style="margin-bottom:1.5rem;">
        <label class="text-label-md" style="text-transform:uppercase;letter-spacing:0.08em;color:var(--on-surface-variant);display:block;margin-bottom:0.5rem;">AVAILABILITY</label>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <span style="padding:0.25rem 0.75rem;border-radius:var(--radius-full);font-size:0.75rem;font-weight:500;background:rgba(45,188,254,0.1);color:var(--secondary);cursor:pointer;">Urgent</span>
          <span style="padding:0.25rem 0.75rem;border-radius:var(--radius-full);font-size:0.75rem;font-weight:500;background:var(--surface-container-low);color:var(--on-surface-variant);cursor:pointer;">Today</span>
          <span style="padding:0.25rem 0.75rem;border-radius:var(--radius-full);font-size:0.75rem;font-weight:500;background:var(--surface-container-low);color:var(--on-surface-variant);cursor:pointer;">Weekend</span>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%;justify-content:center;">Apply Filters</button>
    </aside>

    <!-- Results -->
    <div>
      <!-- Map -->
      <div style="background:var(--surface-container);border-radius:var(--radius-xl);height:220px;margin-bottom:1.5rem;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;top:1rem;left:1rem;background:var(--surface-container-lowest);padding:0.375rem 1rem;border-radius:var(--radius-md);font-size:0.8125rem;font-weight:600;box-shadow:var(--ambient-shadow);z-index:1;">MAP VIEW: ZAPOPAN</div>
        <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=300&fit=crop" alt="Map" style="width:100%;height:100%;object-fit:cover;opacity:0.6;" />
        <div style="position:absolute;top:50%;left:40%;transform:translate(-50%,-50%);">
          <span class="material-symbols-outlined icon-filled" style="font-size:32px;color:var(--secondary);filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">location_on</span>
        </div>
      </div>

      <!-- Professional Cards Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem;">
        ${professionals.map(p => `
        <div class="pro-card" data-route="/profile" style="cursor:pointer;">
          <div style="display:flex;gap:1rem;margin-bottom:0.75rem;">
            <div style="position:relative;">
              <img src="${p.img}" alt="${p.name}" style="width:3.5rem;height:3.5rem;border-radius:var(--radius-lg);object-fit:cover;" />
              <span class="material-symbols-outlined icon-filled" style="position:absolute;bottom:-2px;right:-2px;font-size:14px;color:var(--secondary);background:var(--surface-container-lowest);border-radius:50%;padding:1px;">verified</span>
            </div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <h3 style="font-family:'Manrope';font-weight:700;font-size:1rem;color:var(--primary);">${p.name}</h3>
                <span style="display:flex;align-items:center;gap:0.25rem;font-size:0.8125rem;font-weight:600;color:var(--on-tertiary-container);">
                  <span class="material-symbols-outlined icon-filled" style="font-size:14px;">star</span> ${p.rating}
                </span>
              </div>
              <p style="font-size:0.6875rem;color:var(--secondary);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">${p.title}</p>
              <div style="display:flex;gap:0.75rem;margin-top:0.25rem;font-size:0.75rem;color:var(--on-surface-variant);">
                <span style="display:flex;align-items:center;gap:0.25rem;">
                  <span class="material-symbols-outlined" style="font-size:14px;">check_circle</span> ${p.jobs} Jobs
                </span>
                <span style="display:flex;align-items:center;gap:0.25rem;">
                  <span class="material-symbols-outlined" style="font-size:14px;">schedule</span> ${p.exp} Exp.
                </span>
              </div>
            </div>
          </div>
          <p style="font-size:0.8125rem;color:var(--on-surface-variant);line-height:1.5;margin-bottom:1rem;">${p.desc}</p>
          <div style="display:flex;gap:0.75rem;">
            <button class="btn" style="flex:1;justify-content:center;background:var(--surface-container);color:var(--on-surface);font-size:0.8125rem;">Message</button>
            <button class="btn btn-primary" style="flex:1;justify-content:center;font-size:0.8125rem;">Hire Now</button>
          </div>
        </div>
        `).join('')}
      </div>

      <!-- Pagination -->
      <div style="display:flex;justify-content:center;gap:0.5rem;margin-top:2rem;">
        ${[1,2,3].map((n,i) => `<button style="width:2.25rem;height:2.25rem;border-radius:var(--radius-md);font-size:0.875rem;font-weight:500;${i===0?'background:var(--primary);color:var(--on-primary);':'background:var(--surface-container-lowest);color:var(--on-surface);box-shadow:var(--ambient-shadow);'}">${n}</button>`).join('')}
        <span style="display:flex;align-items:center;color:var(--on-surface-variant);">...</span>
        <button style="width:2.25rem;height:2.25rem;border-radius:var(--radius-md);background:var(--surface-container-lowest);box-shadow:var(--ambient-shadow);">
          <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
        </button>
      </div>
    </div>
  </div>

  ${footer()}
  `;
}
