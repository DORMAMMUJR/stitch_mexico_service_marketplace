// Navbar for public pages (Intecnia brand - Home)
export function navbarIntecnia(activePage = 'marketplace') {
  const links = [
    { label: 'Marketplace', id: 'marketplace', route: '/' },
    { label: 'Services', id: 'services', route: '/directory' },
    { label: 'Consultants', id: 'consultants', route: '/categories' },
    { label: 'Enterprise', id: 'enterprise', route: '/' },
  ];
  return `
  <header class="nav-top" id="nav-intecnia">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:4rem;">
      <div style="display:flex;align-items:center;gap:2rem;">
        <a data-route="/" style="font-family:'Manrope';font-weight:700;font-size:1.25rem;color:var(--primary);letter-spacing:-0.03em;cursor:pointer;">Intecnia</a>
        <nav style="display:flex;gap:0.25rem;" class="hide-mobile">
          ${links.map(l => `<a class="nav-link${l.id === activePage ? ' active' : ''}" data-route="${l.route}">${l.label}</a>`).join('')}
        </nav>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div class="hide-mobile" style="display:flex;align-items:center;gap:0.5rem;background:var(--surface-container-low);border-radius:var(--radius-lg);padding:0.5rem 1rem;">
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--on-surface-variant);">search</span>
          <input type="text" placeholder="Search professionals." style="background:transparent;font-size:0.8125rem;width:140px;color:var(--on-surface);" />
        </div>
        <button style="padding:0.5rem;color:var(--on-surface-variant);border-radius:50%;transition:background 0.2s;" onmouseover="this.style.background='var(--surface-container-low)'" onmouseout="this.style.background='transparent'">
          <span class="material-symbols-outlined" style="font-size:20px;">notifications</span>
        </button>
        <button style="padding:0.5rem;color:var(--on-surface-variant);border-radius:50%;">
          <span class="material-symbols-outlined" style="font-size:20px;">chat</span>
        </button>
        <button style="padding:0.5rem;color:var(--on-surface-variant);border-radius:50%;">
          <span class="material-symbols-outlined" style="font-size:20px;">settings</span>
        </button>
        <div style="width:2rem;height:2rem;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined" style="font-size:16px;color:var(--on-primary);">person</span>
        </div>
      </div>
    </div>
  </header>`;
}

// Navbar for KonectIA pages
export function navbarKonectia(activePage = 'directory') {
  const links = [
    { label: 'Directory', id: 'directory', route: '/directory' },
    { label: 'Categories', id: 'categories', route: '/categories' },
    { label: 'Trust Center', id: 'trust', route: '/verification' },
  ];
  return `
  <header class="nav-top" id="nav-konectia">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;height:4rem;">
      <div style="display:flex;align-items:center;gap:2rem;">
        <a data-route="/" style="font-family:'Manrope';font-weight:700;font-size:1.25rem;color:var(--primary);letter-spacing:-0.03em;cursor:pointer;">KonectIA</a>
        <div class="hide-mobile" style="display:flex;align-items:center;gap:0.5rem;background:var(--surface-container-low);border-radius:var(--radius-lg);padding:0.5rem 1rem;">
          <span class="material-symbols-outlined" style="font-size:18px;color:var(--on-surface-variant);">search</span>
          <input type="text" placeholder="Buscar profesionales..." style="background:transparent;font-size:0.8125rem;width:160px;color:var(--on-surface);" />
        </div>
        <nav style="display:flex;gap:0.25rem;" class="hide-mobile">
          ${links.map(l => `<a class="nav-link${l.id === activePage ? ' active' : ''}" data-route="${l.route}">${l.label}</a>`).join('')}
        </nav>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <button style="padding:0.5rem;color:var(--on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size:20px;">notifications</span>
        </button>
        <button style="padding:0.5rem;color:var(--on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size:20px;">chat</span>
        </button>
        <a data-route="/directory" class="btn btn-primary" style="font-size:0.8125rem;padding:0.5rem 1rem;">Find Service</a>
        <div style="width:2rem;height:2rem;border-radius:50%;overflow:hidden;border:2px solid var(--surface-container);">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmq4mm-ts_P-P5pSawrgKDhStNLY6e-uuSni2ZeTXeN-O0looXQ41SLjYeSHEhaP7UqdbyS5ptqviCZHASXSKwNRbFtUrI82uA9bxWmDx71nAZ9WbrdxwfTWqU2K_doUQwsx41TCGcgtI7BrAjzfDjdNOp73zuU6c0XJdGXBzaMsCk9tNIwxtvAGkq7u87ZRRcnBeldNr6uTauvkONlWGrkylmea19MEeoSfKVCau_55eSRyhESeiWITK1fmgySFgedTAuniRM3r0b" alt="User" style="width:100%;height:100%;object-fit:cover;" />
        </div>
      </div>
    </div>
  </header>`;
}

// Footer
export function footer() {
  return `
  <footer class="footer">
    <div class="container">
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:2rem;margin-bottom:2rem;">
        <div>
          <h3 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;margin-bottom:0.5rem;">KonectIA</h3>
          <p style="font-size:0.75rem;color:var(--on-surface-variant);max-width:280px;">© 2024 KonectIA. The Digital Institution of Professional Services. Innovando el mercado laboral profesional.</p>
        </div>
        <div style="display:flex;gap:2.5rem;flex-wrap:wrap;">
          <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.8125rem;color:var(--on-surface-variant);">
            <a href="#" style="transition:color 0.2s;" onmouseover="this.style.color='var(--secondary)'" onmouseout="this.style.color='var(--on-surface-variant)'">Privacy Policy</a>
            <a href="#" style="transition:color 0.2s;" onmouseover="this.style.color='var(--secondary)'" onmouseout="this.style.color='var(--on-surface-variant)'">Terms of Service</a>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.8125rem;color:var(--on-surface-variant);">
            <a href="#">Escrow Guarantee</a>
            <a href="#" style="text-decoration:underline;">SAT Compliance</a>
          </div>
        </div>
      </div>
      <div style="text-align:center;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.04);font-size:0.6875rem;color:var(--on-surface-variant);text-transform:uppercase;letter-spacing:0.05em;">
        VERIFIED PROFESSIONALS
      </div>
    </div>
  </footer>`;
}

// Notification Banner
export function notifBanner(text = '¡Cita Confirmada! Lunes 24 de Mayo, 10:00 AM. Detalles enviados a tu correo.') {
  return `
  <div class="notif-banner">
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <span class="material-symbols-outlined icon-filled" style="color:var(--secondary);font-size:20px;">check_circle</span>
      <span>${text}</span>
    </div>
    <button data-dismiss style="padding:0.25rem;border-radius:50%;transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'" onmouseout="this.style.background='transparent'">
      <span class="material-symbols-outlined" style="font-size:18px;">close</span>
    </button>
  </div>`;
}

// Trust/Institutional Bar
export function trustBar() {
  return `
  <div style="background:var(--surface-container);padding:1.5rem 2rem;text-align:center;">
    <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.1em;color:var(--secondary);margin-bottom:1rem;">AVALADO POR INSTITUCIONES PROFESIONALES</p>
    <div style="display:flex;justify-content:center;gap:2.5rem;flex-wrap:wrap;align-items:center;">
      ${['CONCANACO','SAT COMPLIANCE','ISO 9001','MEXICO TECH','AMVO'].map(t => 
        `<span style="font-family:'Manrope';font-weight:600;font-size:0.875rem;color:var(--on-surface-variant);opacity:0.5;letter-spacing:0.02em;">${t}</span>`
      ).join('')}
    </div>
  </div>`;
}
