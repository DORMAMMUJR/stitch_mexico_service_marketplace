export function renderDashboard() {
  return `
  <div style="display:flex;min-height:100vh;">
    <!-- Sidebar -->
    <aside class="sidebar" style="width:18rem;padding:1.5rem;">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:2rem;padding:0.5rem;">
        <div style="position:relative;">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOp1V8Mo5Q1XsJxMKf9KjTxJQK7vMgHpGQqI-kcVH8ul_iJSzb2Vb2rdJYxgpS2cT5uxHRs2EKZQuoB0JaOrAtfQWufuaZ62ch2CTCTDjS1JF2tMWMiZQflbbqNnl1dvP6IIHCNPUPyGNcZYsjW4TNBe_TISTt94kT-_avawausQKV5ASglsnF-Ma8Se12kn51Tn7mqUcD79Wg-GwvAlFdWUr7D2o-xFqfMhYAerC1mzF8xB5RaIuJMHLtwB8Wefo93-MORNCeF_Io" alt="Marcos Rivera" style="width:3rem;height:3rem;border-radius:50%;object-fit:cover;" />
          <div style="position:absolute;bottom:0;right:0;width:10px;height:10px;background:var(--secondary);border-radius:50%;border:2px solid white;"></div>
        </div>
        <div>
          <h2 style="font-family:'Manrope';font-weight:600;font-size:0.9375rem;color:var(--primary);">Marcos Rivera</h2>
          <p style="font-size:0.75rem;color:var(--on-surface-variant);">Senior Consultant • Verified</p>
        </div>
      </div>

      <nav style="flex:1;display:flex;flex-direction:column;gap:0.25rem;">
        <a class="sidebar-link active" data-route="/dashboard"><span class="material-symbols-outlined icon-filled" style="font-size:20px;">dashboard</span> Dashboard</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">work</span> Active Projects</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">insights</span> Analytics</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">forum</span> Client Messages</a>
        <a class="sidebar-link" href="#"><span class="material-symbols-outlined" style="font-size:20px;">account_balance_wallet</span> Finances</a>
      </nav>

      <div style="margin-top:auto;">
        <div style="background:rgba(0,0,0,0.02);border-radius:var(--radius-xl);padding:1.25rem;text-align:center;margin-bottom:1rem;">
          <span class="material-symbols-outlined" style="font-size:24px;color:var(--tertiary-container);margin-bottom:0.5rem;display:block;">workspace_premium</span>
          <p style="font-size:0.75rem;color:var(--on-surface-variant);margin-bottom:0.75rem;">Unlock advanced analytics.</p>
          <button class="btn btn-primary" style="width:100%;justify-content:center;font-size:0.75rem;">Go Premium</button>
        </div>
        <div style="border-top:1px solid rgba(0,0,0,0.04);padding-top:0.75rem;display:flex;flex-direction:column;gap:0.25rem;">
          <a class="sidebar-link" href="#" style="font-size:0.8125rem;"><span class="material-symbols-outlined" style="font-size:18px;">help</span> Help Center</a>
          <a class="sidebar-link" data-route="/" style="font-size:0.8125rem;"><span class="material-symbols-outlined" style="font-size:18px;">logout</span> Log Out</a>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-with-sidebar" style="flex:1;margin-left:18rem;padding:3rem;">
      <!-- Header -->
      <header style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3rem;">
        <div>
          <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.1em;color:var(--on-surface-variant);margin-bottom:0.25rem;">OVERVIEW</p>
          <h1 style="font-family:'Manrope';font-size:clamp(2rem,4vw,3rem);font-weight:700;color:var(--primary);letter-spacing:-0.02em;">Performance</h1>
        </div>
        <div style="display:flex;gap:0.75rem;" class="hide-mobile">
          <button class="btn btn-outline"><span class="material-symbols-outlined" style="font-size:16px;">calendar_today</span> Last 30 Days</button>
          <button class="btn btn-secondary"><span class="material-symbols-outlined" style="font-size:16px;">download</span> Export</button>
        </div>
      </header>

      <!-- Bento Grid -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;">
        <!-- Profile Views Card -->
        <div class="card" style="padding:2rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;">
            <div>
              <h3 style="font-family:'Manrope';font-weight:600;font-size:1.125rem;color:var(--on-surface);margin-bottom:0.25rem;">Total Profile Views</h3>
              <p style="font-size:0.875rem;color:var(--on-surface-variant);">Organic & promoted traffic</p>
            </div>
            <div style="display:flex;align-items:center;gap:0.25rem;background:var(--surface-container-low);padding:0.25rem 0.75rem;border-radius:var(--radius-full);">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--secondary);">trending_up</span>
              <span style="font-size:0.75rem;font-weight:600;color:var(--secondary);">+24.5%</span>
            </div>
          </div>
          <p style="font-family:'Manrope';font-size:3rem;font-weight:700;color:var(--primary);letter-spacing:-0.02em;margin-bottom:1.5rem;">12,450</p>
          <!-- Chart SVG -->
          <div style="height:100px;">
            <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2dbcfe" stop-opacity="0.2"/><stop offset="100%" stop-color="#2dbcfe" stop-opacity="0"/></linearGradient></defs>
              <path d="M0,100 L0,60 C20,50 40,80 60,65 C80,50 100,40 120,55 C140,70 160,30 180,45 C200,60 220,20 240,35 C260,50 280,15 300,25 C320,35 340,10 360,15 C380,20 400,5 400,5 L400,100 Z" fill="url(#cg)"/>
              <path d="M0,60 C20,50 40,80 60,65 C80,50 100,40 120,55 C140,70 160,30 180,45 C200,60 220,20 240,35 C260,50 280,15 300,25 C320,35 340,10 360,15 C380,20 400,5 400,5" fill="none" stroke="#2dbcfe" stroke-width="3" stroke-linecap="round"/>
              <circle cx="180" cy="45" r="4" fill="#fff" stroke="#2dbcfe" stroke-width="2"/>
              <circle cx="300" cy="25" r="4" fill="#fff" stroke="#2dbcfe" stroke-width="2"/>
              <circle cx="400" cy="5" r="5" fill="#2dbcfe" stroke="#fff" stroke-width="2"/>
            </svg>
          </div>
        </div>

        <!-- Total Interactions -->
        <div class="card" style="padding:2rem;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="width:3rem;height:3rem;background:var(--surface-container);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
              <span class="material-symbols-outlined" style="font-size:24px;color:var(--primary);">touch_app</span>
            </div>
            <h3 style="font-family:'Manrope';font-weight:600;font-size:1.125rem;margin-bottom:0.25rem;">Total Interactions</h3>
            <p style="font-size:0.875rem;color:var(--on-surface-variant);">Clicks on portfolio & contact</p>
          </div>
          <div>
            <p style="font-family:'Manrope';font-size:3rem;font-weight:700;color:var(--primary);letter-spacing:-0.02em;">842</p>
            <div class="progress-bar" style="margin-top:1rem;"><div class="progress-fill" style="width:65%;background:var(--primary);"></div></div>
            <p style="font-size:0.75rem;color:var(--on-surface-variant);margin-top:0.75rem;">65% conversion to profile view</p>
          </div>
        </div>

        <!-- AI Assistant Card -->
        <div style="grid-column:span 2;background:var(--primary);border-radius:var(--radius-2xl);padding:2.5rem;position:relative;overflow:hidden;display:flex;flex-wrap:wrap;gap:2rem;align-items:center;">
          <div style="position:absolute;inset:0;background:radial-gradient(circle at top right,var(--primary-container),var(--primary));opacity:0.9;"></div>
          <div style="position:relative;z-index:1;flex:1;min-width:280px;">
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
              <div style="width:2.5rem;height:2.5rem;background:rgba(255,255,255,0.1);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.05);">
                <span class="material-symbols-outlined" style="color:var(--secondary-container);font-size:20px;">smart_toy</span>
              </div>
              <h2 style="font-family:'Manrope';font-size:1.5rem;font-weight:700;color:var(--on-primary);letter-spacing:-0.01em;">Asistencia IA</h2>
            </div>
            <p style="color:var(--primary-fixed-dim);line-height:1.6;max-width:450px;margin-bottom:1rem;">
              Your intelligent assistant is actively managing initial inquiries, qualifying leads, and scheduling consultations while you focus on delivery.
            </p>
            <a href="#" style="display:inline-flex;align-items:center;gap:0.375rem;font-size:0.875rem;font-weight:600;color:var(--secondary-container);">
              Configure Bot Parameters <span class="material-symbols-outlined" style="font-size:16px;">arrow_forward</span>
            </a>
          </div>
          <div style="position:relative;z-index:1;display:flex;gap:1rem;flex-wrap:wrap;">
            <div style="background:rgba(255,255,255,0.05);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-2xl);padding:1.5rem;min-width:160px;text-align:center;">
              <p style="font-family:'Manrope';font-size:2.5rem;font-weight:700;color:var(--on-primary);letter-spacing:-0.02em;">145</p>
              <p style="font-size:0.8125rem;color:var(--primary-fixed-dim);">Mensajes automatizados</p>
            </div>
            <div style="background:rgba(45,188,254,0.1);backdrop-filter:blur(16px);border:1px solid rgba(45,188,254,0.2);border-radius:var(--radius-2xl);padding:1.5rem;min-width:160px;text-align:center;">
              <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.25rem;">
                <span class="material-symbols-outlined" style="font-size:20px;color:var(--secondary-container);">event_available</span>
                <p style="font-family:'Manrope';font-size:2.5rem;font-weight:700;color:var(--secondary-container);letter-spacing:-0.02em;">12</p>
              </div>
              <p style="font-size:0.8125rem;color:var(--primary-fixed-dim);">Citas agendadas</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
  `;
}
