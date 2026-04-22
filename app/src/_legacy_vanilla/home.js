import { navbarIntecnia, footer } from '../components.js';

export function renderHome() {
  return `
  ${navbarIntecnia('marketplace')}

  <!-- Hero Section -->
  <section class="hero-gradient" style="padding:5rem 1.5rem 3rem;text-align:center;color:var(--on-primary);">
    <p class="text-label-md" style="text-transform:uppercase;letter-spacing:0.15em;color:var(--primary-fixed-dim);margin-bottom:1rem;">THE DIGITAL INSTITUTION</p>
    <h1 style="font-family:'Manrope';font-size:clamp(2.25rem,5vw,3.5rem);font-weight:700;letter-spacing:-0.02em;line-height:1.1;max-width:700px;margin:0 auto 1.25rem;">¿Qué profesional buscas hoy?</h1>
    <p style="font-size:1rem;color:var(--primary-fixed-dim);max-width:520px;margin:0 auto 2rem;line-height:1.6;">
      Connect with Mexico's most authoritative network of verified consultants, legal experts, and technical specialists.
    </p>
    <!-- Search Bar -->
    <div style="max-width:560px;margin:0 auto;background:var(--surface-container-lowest);border-radius:var(--radius-xl);padding:0.5rem;display:flex;align-items:center;box-shadow:var(--ambient-shadow-lg);">
      <div style="display:flex;align-items:center;gap:0.5rem;flex:1;padding:0 1rem;">
        <span class="material-symbols-outlined" style="color:var(--on-surface-variant);font-size:20px;">search</span>
        <input type="text" placeholder="e.g. Abogado Fiscal, Consultor IT, Ingeniero..." style="flex:1;padding:0.75rem 0;font-size:0.875rem;color:var(--on-surface);background:transparent;" id="hero-search" />
      </div>
      <button class="btn btn-primary" style="border-radius:var(--radius-md);padding:0.625rem 1.5rem;" data-route="/directory">
        SEARCH <span class="material-symbols-outlined" style="font-size:16px;">arrow_forward</span>
      </button>
    </div>
  </section>

  <!-- Trust & Compliance Bar -->
  <div class="trust-bar">
    <span class="trust-item" style="font-weight:600;text-transform:uppercase;letter-spacing:0.05em;font-size:0.75rem;">TRUST & COMPLIANCE</span>
    <span class="trust-item">
      <span class="material-symbols-outlined icon-filled" style="font-size:16px;color:var(--secondary);">verified_user</span>
      SAT Compliant
    </span>
    <span class="trust-item">
      <span class="material-symbols-outlined" style="font-size:16px;color:var(--on-surface-variant);">fingerprint</span>
      Biometric Security
    </span>
    <span class="trust-item">
      <span class="material-symbols-outlined icon-filled" style="font-size:16px;color:var(--secondary);">shield</span>
      100% Verified Identities
    </span>
  </div>

  <!-- Explore Expertise Section -->
  <section style="padding:4rem 1.5rem;" class="container">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
      <div>
        <h2 class="text-headline-md" style="color:var(--primary);margin-bottom:0.25rem;">Explore Expertise</h2>
        <p style="color:var(--on-surface-variant);font-size:0.9375rem;">Browse vetted professionals by institutional category.</p>
      </div>
      <a data-route="/categories" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;color:var(--secondary);display:flex;align-items:center;gap:0.25rem;cursor:pointer;">
        VIEW ALL CATEGORIES <span class="material-symbols-outlined" style="font-size:14px;">chevron_right</span>
      </a>
    </div>

    <!-- Category Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;">
      <!-- Legal & Compliance (Large) -->
      <div class="cat-card" style="grid-column:span 2;padding:2rem;background:var(--surface-container-low);min-height:200px;display:flex;flex-direction:column;justify-content:flex-end;position:relative;">
        <div class="cat-icon" style="background:rgba(45,188,254,0.1);color:var(--secondary);position:absolute;top:1.5rem;left:1.5rem;">
          <span class="material-symbols-outlined icon-filled">gavel</span>
        </div>
        <div style="position:absolute;right:1.5rem;bottom:1.5rem;opacity:0.06;font-size:8rem;color:var(--primary);">
          <span class="material-symbols-outlined" style="font-size:inherit;">balance</span>
        </div>
        <h3 class="text-headline-md" style="color:var(--primary);margin-bottom:0.5rem;">Legal & Compliance</h3>
        <p style="color:var(--on-surface-variant);font-size:0.875rem;max-width:380px;">Corporate law, tax audits, intellectual property, and labor regulations handled by top-tier firms.</p>
      </div>

      <!-- Finance & Tax -->
      <div class="cat-card" data-route="/directory" style="cursor:pointer;">
        <div class="cat-icon" style="background:rgba(10,29,55,0.06);color:var(--primary);">
          <span class="material-symbols-outlined">account_balance</span>
        </div>
        <h3 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);margin-bottom:0.375rem;">Finance & Tax</h3>
        <p style="color:var(--on-surface-variant);font-size:0.8125rem;line-height:1.5;">Certified accountants, financial advisors, and wealth management experts.</p>
      </div>

      <!-- Engineering -->
      <div class="cat-card" data-route="/directory" style="cursor:pointer;">
        <div class="cat-icon" style="background:rgba(10,29,55,0.06);color:var(--primary);">
          <span class="material-symbols-outlined">engineering</span>
        </div>
        <h3 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);margin-bottom:0.375rem;">Engineering</h3>
        <p style="color:var(--on-surface-variant);font-size:0.8125rem;line-height:1.5;">Civil, structural, and industrial engineering consultants.</p>
      </div>

      <!-- IT & Security -->
      <div class="cat-card" data-route="/directory" style="cursor:pointer;">
        <div class="cat-icon" style="background:rgba(231,83,29,0.08);color:var(--on-tertiary-container);">
          <span class="material-symbols-outlined">security</span>
        </div>
        <h3 style="font-family:'Manrope';font-weight:700;font-size:1.125rem;color:var(--primary);margin-bottom:0.375rem;">IT & Security</h3>
        <p style="color:var(--on-surface-variant);font-size:0.8125rem;line-height:1.5;">Systems architects, cybersecurity auditors, and data specialists.</p>
      </div>

      <!-- Enterprise CTA -->
      <div style="background:var(--primary);border-radius:var(--radius-xl);padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1rem;cursor:pointer;" data-route="/categories">
        <h3 style="font-family:'Manrope';font-weight:600;font-size:1.125rem;color:var(--on-primary);">Need a bespoke team?</h3>
        <button class="btn" style="background:var(--surface-container-lowest);color:var(--primary);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">ENTERPRISE SOLUTIONS</button>
      </div>
    </div>
  </section>

  ${footer()}
  `;
}
