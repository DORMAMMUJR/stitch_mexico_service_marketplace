import { navbarKonectia, footer, notifBanner } from '../components.js';

export function renderProfile() {
  return `
  ${notifBanner()}
  ${navbarKonectia('directory')}

  <div class="container" style="padding:2rem 1.5rem 4rem;display:grid;grid-template-columns:1fr 380px;gap:2rem;align-items:start;">
    <!-- Left Column -->
    <div>
      <!-- Profile Card -->
      <div class="card" style="padding:2.5rem;margin-bottom:2rem;">
        <div style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;">
          <div style="position:relative;">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=180&fit=crop&crop=face" alt="Ing. Ricardo Mendoza" style="width:9rem;height:10rem;border-radius:var(--radius-xl);object-fit:cover;" />
          </div>
          <div style="flex:1;min-width:240px;">
            <h1 style="font-family:'Manrope';font-size:2rem;font-weight:700;color:var(--primary);margin-bottom:0.25rem;">Ing. Ricardo Mendoza</h1>
            <p style="color:var(--on-surface-variant);font-size:0.9375rem;margin-bottom:1rem;">Especialista en Consultoría Industrial & Optimización</p>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
              <span class="badge"><span class="material-symbols-outlined" style="font-size:14px;">fingerprint</span> BIOMETRIC VERIFIED</span>
              <span class="badge"><span class="material-symbols-outlined" style="font-size:14px;">account_balance</span> SAT COMPLIANT</span>
            </div>
            <span class="badge badge-cyan"><span class="material-symbols-outlined icon-filled" style="font-size:14px;">verified</span> CONOCER CERTIFIED</span>
          </div>
        </div>
      </div>

      <!-- About Section -->
      <div class="card" style="padding:2rem;margin-bottom:2rem;">
        <h2 class="text-headline-md" style="color:var(--primary);margin-bottom:1rem;">Sobre Mí</h2>
        <p style="color:var(--on-surface-variant);line-height:1.7;margin-bottom:2rem;">
          Con más de 15 años de experiencia en la optimización de procesos industriales, mi enfoque se centra en la integración tecnológica y la eficiencia operativa. He asesorado a más de 50 plantas de manufactura en México, logrando reducciones de costos operativos de hasta un 25% mediante metodologías Lean y análisis predictivo.
        </p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;">
          ${[
            { val: '15+', label: 'AÑOS EXP.' },
            { val: '50+', label: 'PLANTAS ASESORADAS' },
            { val: '25%', label: 'REDUCCIÓN COSTOS' },
            { val: '4.9', label: '★ RATING' },
          ].map(s => `
          <div>
            <p style="font-family:'Manrope';font-size:1.75rem;font-weight:700;color:var(--primary);margin-bottom:0.25rem;">${s.val}</p>
            <p class="text-label-md" style="text-transform:uppercase;color:var(--on-surface-variant);">${s.label}</p>
          </div>`).join('')}
        </div>
      </div>

      <!-- Portfolio -->
      <h2 class="text-headline-md" style="color:var(--primary);margin-bottom:1rem;">Portafolio Destacado</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="border-radius:var(--radius-xl);overflow:hidden;position:relative;height:200px;cursor:pointer;">
          <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop" alt="Automatización" style="width:100%;height:100%;object-fit:cover;" />
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent);"></div>
          <div style="position:absolute;bottom:1rem;left:1rem;color:var(--on-primary);">
            <span style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-container);font-weight:600;">MANUFACTURA AUTOMOTRIZ</span>
            <h4 style="font-family:'Manrope';font-weight:700;font-size:1rem;margin-top:0.25rem;">Automatización Planta Monterrey</h4>
          </div>
        </div>
        <div style="border-radius:var(--radius-xl);overflow:hidden;position:relative;height:200px;cursor:pointer;">
          <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop" alt="Logística" style="width:100%;height:100%;object-fit:cover;" />
          <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent);"></div>
          <div style="position:absolute;bottom:1rem;left:1rem;color:var(--on-primary);">
            <span style="font-size:0.625rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-container);font-weight:600;">CADENA DE SUMINISTRO</span>
            <h4 style="font-family:'Manrope';font-weight:700;font-size:1rem;margin-top:0.25rem;">Optimización Logística CDMX</h4>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Column: AI Chat -->
    <div class="card" style="position:sticky;top:5rem;display:flex;flex-direction:column;height:560px;">
      <div style="padding:1.25rem;background:var(--primary);border-radius:var(--radius-xl) var(--radius-xl) 0 0;display:flex;align-items:center;gap:0.75rem;">
        <div style="width:2.5rem;height:2.5rem;border-radius:var(--radius-lg);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined" style="color:var(--secondary-container);">smart_toy</span>
        </div>
        <div>
          <h3 style="font-family:'Manrope';font-weight:600;font-size:0.9375rem;color:var(--on-primary);">Asistente de Reservas AI</h3>
          <p style="font-size:0.6875rem;color:var(--primary-fixed-dim);text-transform:uppercase;letter-spacing:0.05em;">AGENDANDO CONSULTORÍA INDUSTRIAL</p>
        </div>
      </div>

      <div id="chat-messages" class="chat-messages" style="flex:1;background:var(--background);">
        <div style="display:flex;gap:0.75rem;align-items:flex-start;">
          <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:rgba(45,188,254,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:14px;color:var(--secondary);">smart_toy</span>
          </div>
          <div class="chat-bubble bot">Hola. Soy el asistente del Ing. Ricardo Mendoza. He revisado su solicitud para una "Consultoría Industrial". ¿Le parece bien agendar una videollamada inicial de 45 minutos?</div>
        </div>

        <div style="display:flex;gap:0.75rem;align-items:flex-start;justify-content:flex-end;">
          <div class="chat-bubble user">Sí, me parece perfecto. ¿Qué disponibilidad tiene la próxima semana?</div>
          <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:var(--surface-container);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:14px;">person</span>
          </div>
        </div>

        <div style="display:flex;gap:0.75rem;align-items:flex-start;">
          <div style="width:1.75rem;height:1.75rem;border-radius:50%;background:rgba(45,188,254,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span class="material-symbols-outlined" style="font-size:14px;color:var(--secondary);">smart_toy</span>
          </div>
          <div>
            <div class="chat-bubble bot" style="margin-bottom:0.5rem;">El ingeniero tiene los siguientes espacios disponibles para la próxima semana:</div>
            <div style="background:var(--surface-container-lowest);border:1px solid rgba(197,198,206,0.2);border-radius:var(--radius-lg);padding:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;border-radius:var(--radius-md);margin-bottom:0.375rem;background:rgba(45,188,254,0.06);border:1px solid rgba(45,188,254,0.2);cursor:pointer;">
                <span style="font-size:0.875rem;font-weight:500;">Lunes 24 de Mayo</span>
                <span style="font-size:0.875rem;font-weight:600;color:var(--secondary);">10:00 AM</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;border-radius:var(--radius-md);cursor:pointer;" onmouseover="this.style.background='var(--surface-container-low)'" onmouseout="this.style.background='transparent'">
                <span style="font-size:0.875rem;font-weight:500;">Martes 25 de Mayo</span>
                <span style="font-size:0.875rem;color:var(--on-surface-variant);">4:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div style="display:flex;align-items:center;gap:0.5rem;background:var(--surface-container-low);border-radius:var(--radius-lg);padding:0.5rem 1rem;">
          <input id="chat-input" type="text" placeholder="El chat ha finalizado..." style="flex:1;background:transparent;font-size:0.875rem;padding:0.375rem 0;" />
          <button id="chat-send" style="color:var(--secondary);padding:0.25rem;">
            <span class="material-symbols-outlined icon-filled" style="font-size:20px;">send</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  ${footer()}
  `;
}
