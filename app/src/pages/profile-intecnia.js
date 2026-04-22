import { notifBanner } from '../components.js';

export function renderProfileIntecnia() {
  return `
  <div style="display:flex;min-height:100vh;">
    <!-- Sidebar -->
    <nav class="sidebar" style="width:16rem;">
      <div style="margin-bottom:2rem;padding:0.5rem;">
        <h1 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);letter-spacing:-0.02em;">Intecnia</h1>
        <p style="font-size:0.75rem;color:var(--on-surface-variant);margin-top:0.125rem;">Professional Services</p>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:0.25rem;">
        <a class="sidebar-link active" data-route="/profile-intecnia"><span class="material-symbols-outlined icon-filled" style="font-size:20px;">account_circle</span> Overview</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">work</span> Portfolio</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">business_center</span> Services</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">star</span> Reviews</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">chat</span> Contact</a>
      </div>
      <div style="margin-top:auto;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.04);">
        <button class="btn" style="width:100%;justify-content:center;background:var(--secondary);color:var(--on-secondary);border-radius:var(--radius-lg);margin-bottom:1rem;">Upgrade to Premium</button>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">help</span> Help Center</a>
        <a class="sidebar-link" data-route="/"><span class="material-symbols-outlined" style="font-size:20px;">logout</span> Log out</a>
      </div>
    </nav>

    <!-- Main -->
    <main class="main-with-sidebar" style="flex:1;margin-left:16rem;display:flex;flex-direction:column;">
      <!-- Top Nav -->
      <header class="nav-top" style="position:sticky;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:4rem;">
          <nav style="display:flex;gap:0.25rem;" class="hide-mobile">
            <a class="nav-link" data-route="/">Marketplace</a>
            <a class="nav-link active">My Schedule</a>
            <a class="nav-link" href="#">Messages</a>
            <a class="nav-link" href="#">Network</a>
          </nav>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <button style="padding:0.5rem;color:var(--on-surface-variant);"><span class="material-symbols-outlined" style="font-size:20px;">notifications</span></button>
            <button style="padding:0.5rem;color:var(--on-surface-variant);"><span class="material-symbols-outlined" style="font-size:20px;">settings</span></button>
            <button class="btn btn-primary" style="border-radius:var(--radius-lg);">Book Session</button>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmq4mm-ts_P-P5pSawrgKDhStNLY6e-uuSni2ZeTXeN-O0looXQ41SLjYeSHEhaP7UqdbyS5ptqviCZHASXSKwNRbFtUrI82uA9bxWmDx71nAZ9WbrdxwfTWqU2K_doUQwsx41TCGcgtI7BrAjzfDjdNOp73zuU6c0XJdGXBzaMsCk9tNIwxtvAGkq7u87ZRRcnBeldNr6uTauvkONlWGrkylmea19MEeoSfKVCau_55eSRyhESeiWITK1fmgySFgedTAuniRM3r0b" alt="User" style="width:2.25rem;height:2.25rem;border-radius:50%;object-fit:cover;border:2px solid var(--surface-container);" />
          </div>
        </div>
      </header>

      ${notifBanner()}

      <!-- Content -->
      <div style="padding:2rem;display:grid;grid-template-columns:1fr 340px;gap:2rem;flex:1;max-width:1200px;">
        <!-- Left -->
        <div style="display:flex;flex-direction:column;gap:1.5rem;">
          <!-- Profile Card -->
          <div class="card" style="padding:2rem;position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;right:0;width:12rem;height:12rem;background:linear-gradient(135deg,rgba(182,199,233,0.2),transparent);border-bottom-left-radius:4rem;"></div>
            <div style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;">
              <div style="position:relative;">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrwPmE9CoFFSgITGHpmV4gf3JXz5_d_KKsl3NpeD-gLu8Q0a0xTgEbSzkqZKlxU8gKQvVptrjClTG2PI8cYgiAZEq1TPchX9BJvojFC6KI93Onksd5UPL3z2FPpQ-8J8Jd6sf0NQdVoF523XtpDfak4CWHO1OqI_36cvxI6IsAZD_ijxR9SnWdbug6vb__VCyf86_XVn4P4HLLepW7PJsJKygS9vFiSLJLTUZl1Z_KCY4hkMdOyIQFNQDXXS8FD8zmxRarlYif8hhq" alt="Dr. Roberto Silva" style="width:8rem;height:8rem;border-radius:var(--radius-xl);object-fit:cover;box-shadow:var(--ambient-shadow);" />
                <div style="position:absolute;bottom:-4px;right:-4px;background:var(--surface-container-highest);padding:3px;border-radius:50%;border:3px solid var(--surface-container-lowest);">
                  <span class="material-symbols-outlined icon-filled" style="font-size:14px;color:var(--secondary);">verified</span>
                </div>
              </div>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
                  <div>
                    <h1 style="font-family:'Manrope';font-size:1.5rem;font-weight:700;color:var(--primary);">Dr. Roberto Silva</h1>
                    <p style="color:var(--on-surface-variant);margin-bottom:0.75rem;">Consultor Fiscal Senior & Estratega Financiero</p>
                  </div>
                  <div style="display:flex;gap:0.375rem;">
                    <span class="badge"><span class="material-symbols-outlined" style="font-size:12px;">fingerprint</span> Biometric Verified</span>
                    <span class="badge"><span class="material-symbols-outlined" style="font-size:12px;">account_balance</span> SAT Compliant</span>
                  </div>
                </div>
                <p style="color:var(--on-surface-variant);font-size:0.875rem;line-height:1.6;margin-bottom:1.25rem;max-width:500px;">
                  Especialista en reestructuración fiscal corporativa con más de 15 años de experiencia. Asesorando a empresas Fortune 500 en optimización de procesos contables y cumplimiento normativo en México.
                </p>
                <div style="display:flex;gap:0.75rem;">
                  <button class="btn btn-primary"><span class="material-symbols-outlined" style="font-size:16px;">mail</span> Mensaje Directo</button>
                  <button class="btn btn-outline">Descargar CV</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <div class="card-elevated" style="padding:1.5rem;">
              <h3 class="text-title-lg" style="color:var(--primary);margin-bottom:0.75rem;">Especialidades</h3>
              <div style="display:flex;flex-direction:column;gap:0.75rem;">
                ${['trending_up|Optimización Fiscal','gavel|Auditoría Preventiva','public|Tributación Internacional'].map(s => {
                  const [icon, label] = s.split('|');
                  return `<div style="display:flex;align-items:center;gap:0.75rem;color:var(--on-surface-variant);"><span class="material-symbols-outlined" style="color:var(--secondary);font-size:20px;">${icon}</span>${label}</div>`;
                }).join('')}
              </div>
            </div>
            <div class="card-elevated" style="padding:1.5rem;">
              <h3 class="text-title-lg" style="color:var(--primary);margin-bottom:0.75rem;">Métricas de Confianza</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:0.5rem;">
                <div><p style="font-family:'Manrope';font-size:1.75rem;font-weight:700;color:var(--primary);">98%</p><p class="text-label-md" style="text-transform:uppercase;color:var(--on-surface-variant);">CASOS DE ÉXITO</p></div>
                <div><p style="font-family:'Manrope';font-size:1.75rem;font-weight:700;color:var(--primary);">15+</p><p class="text-label-md" style="text-transform:uppercase;color:var(--on-surface-variant);">AÑOS EXP.</p></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: AI Chat -->
        <div class="card" style="display:flex;flex-direction:column;height:520px;position:sticky;top:5rem;">
          <div style="padding:1rem 1.25rem;background:var(--surface-bright);border-bottom:1px solid var(--surface-container-low);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:2.25rem;height:2.25rem;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;">
                <span class="material-symbols-outlined" style="color:var(--on-primary);font-size:18px;">smart_toy</span>
              </div>
              <div>
                <h3 style="font-size:0.875rem;font-weight:600;color:var(--primary);">Asistente de Reservas AI</h3>
                <div style="display:flex;align-items:center;gap:0.25rem;font-size:0.6875rem;color:var(--on-surface-variant);">
                  <span style="width:6px;height:6px;border-radius:50%;background:var(--secondary-container);"></span> En línea y listo para agendar
                </div>
              </div>
            </div>
            <button style="color:var(--on-surface-variant);"><span class="material-symbols-outlined">more_vert</span></button>
          </div>

          <div id="chat-messages" class="chat-messages" style="flex:1;background:var(--background);">
            <div style="display:flex;gap:0.5rem;"><div style="width:1.5rem;height:1.5rem;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:12px;color:var(--on-primary);">smart_toy</span></div><div class="chat-bubble bot">Hola, soy el asistente virtual de Intecnia. Veo que te interesa una consulta con el Dr. Roberto Silva. ¿Para qué fecha estabas buscando?</div></div>
            <div style="display:flex;justify-content:flex-end;"><div class="chat-bubble user">Necesito una asesoría para la próxima semana, preferiblemente el lunes por la mañana.</div></div>
            <div style="display:flex;gap:0.5rem;"><div style="width:1.5rem;height:1.5rem;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:12px;color:var(--on-primary);">smart_toy</span></div><div class="chat-bubble bot">Revisando la agenda del Dr. Silva en tiempo real... Tengo estos horarios disponibles para el</div></div>
          </div>

          <div class="chat-input-area">
            <div style="display:flex;align-items:center;background:var(--surface-container-low);border-radius:var(--radius-lg);padding:0.5rem 1rem;">
              <input id="chat-input" type="text" placeholder="Escribe tu mensaje..." style="flex:1;background:transparent;font-size:0.875rem;padding:0.375rem 0;" />
              <button id="chat-send" style="color:var(--primary-container);"><span class="material-symbols-outlined icon-filled" style="font-size:20px;">send</span></button>
            </div>
            <p style="text-align:center;font-size:0.625rem;color:var(--on-surface-variant);margin-top:0.5rem;display:flex;align-items:center;justify-content:center;gap:0.25rem;">
              <span class="material-symbols-outlined" style="font-size:10px;">lock</span> Chat seguro encriptado
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
  `;
}
