import React from 'react';
import { Link } from 'react-router-dom';
import { NotifBanner } from '../components/NotifBanner';

export function IntecniaProfilePage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav className="sidebar" style={{ width: '16rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2rem', padding: '0.5rem' }}>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>Intecnia</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>Professional Services</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link to="/intecnia-profile" className="sidebar-link active"><span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>account_circle</span> Overview</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>work</span> Portfolio</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>business_center</span> Services</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>star</span> Reviews</Link>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span> Contact</Link>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', background: 'var(--secondary)', color: 'var(--on-secondary)', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}>Upgrade to Premium</button>
          <Link to="#" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>help</span> Help Center</Link>
          <Link to="/" className="sidebar-link"><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span> Log out</Link>
        </div>
      </nav>

      {/* Main */}
      <main className="main-with-sidebar" style={{ flex: 1, marginLeft: '16rem', display: 'flex', flexDirection: 'column' }}>
        {/* Top Nav */}
        <header className="nav-top" style={{ position: 'sticky' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '4rem' }}>
            <nav style={{ display: 'flex', gap: '0.25rem' }} className="hide-mobile">
              <Link to="/" className="nav-link">Marketplace</Link>
              <Link to="#" className="nav-link active">My Schedule</Link>
              <Link to="#" className="nav-link">Messages</Link>
              <Link to="#" className="nav-link">Network</Link>
            </nav>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', border: 'none', background: 'transparent' }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>notifications</span></button>
              <button style={{ padding: '0.5rem', color: 'var(--on-surface-variant)', border: 'none', background: 'transparent' }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span></button>
              <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-lg)' }}>Book Session</button>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmq4mm-ts_P-P5pSawrgKDhStNLY6e-uuSni2ZeTXeN-O0looXQ41SLjYeSHEhaP7UqdbyS5ptqviCZHASXSKwNRbFtUrI82uA9bxWmDx71nAZ9WbrdxwfTWqU2K_doUQwsx41TCGcgtI7BrAjzfDjdNOp73zuU6c0XJdGXBzaMsCk9tNIwxtvAGkq7u87ZRRcnBeldNr6uTauvkONlWGrkylmea19MEeoSfKVCau_55eSRyhESeiWITK1fmgySFgedTAuniRM3r0b" alt="User" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-container)' }} />
            </div>
          </div>
        </header>

        <NotifBanner />

        {/* Content */}
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', flex: 1, maxWidth: '1200px' }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Profile Card */}
            <div className="card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '12rem', height: '12rem', background: 'linear-gradient(135deg,rgba(182,199,233,0.2),transparent)', borderBottomLeftRadius: '4rem' }}></div>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrwPmE9CoFFSgITGHpmV4gf3JXz5_d_KKsl3NpeD-gLu8Q0a0xTgEbSzkqZKlxU8gKQvVptrjClTG2PI8cYgiAZEq1TPchX9BJvojFC6KI93Onksd5UPL3z2FPpQ-8J8Jd6sf0NQdVoF523XtpDfak4CWHO1OqI_36cvxI6IsAZD_ijxR9SnWdbug6vb__VCyf86_XVn4P4HLLepW7PJsJKygS9vFiSLJLTUZl1Z_KCY4hkMdOyIQFNQDXXS8FD8zmxRarlYif8hhq" alt="Dr. Roberto Silva" style={{ width: '8rem', height: '8rem', borderRadius: 'var(--radius-xl)', objectFit: 'cover', boxShadow: 'var(--ambient-shadow)' }} />
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--surface-container-highest)', padding: '3px', borderRadius: '50%', border: '3px solid var(--surface-container-lowest)' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px', color: 'var(--secondary)' }}>verified</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h1 style={{ fontFamily: 'Manrope', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>Dr. Roberto Silva</h1>
                      <p style={{ color: 'var(--on-surface-variant)', marginBottom: '0.75rem' }}>Consultor Fiscal Senior & Estratega Financiero</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>fingerprint</span> Biometric Verified</span>
                      <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>account_balance</span> SAT Compliant</span>
                    </div>
                  </div>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem', maxWidth: '500px' }}>
                    Especialista en reestructuración fiscal corporativa con más de 15 años de experiencia. Asesorando a empresas Fortune 500 en optimización de procesos contables y cumplimiento normativo en México.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span> Mensaje Directo</button>
                    <button className="btn btn-outline">Descargar CV</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="card-elevated" style={{ padding: '1.5rem' }}>
                <h3 className="text-title-lg" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Especialidades</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {['trending_up|Optimización Fiscal', 'gavel|Auditoría Preventiva', 'public|Tributación Internacional'].map(s => {
                    const [icon, label] = s.split('|');
                    return (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--on-surface-variant)' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '20px' }}>{icon}</span>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card-elevated" style={{ padding: '1.5rem' }}>
                <h3 className="text-title-lg" style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Métricas de Confianza</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>98%</p>
                    <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>CASOS DE ÉXITO</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>15+</p>
                    <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>AÑOS EXP.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Chat */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '520px', position: 'sticky', top: '5rem' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-bright)', borderBottom: '1px solid var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--on-primary)', fontSize: '18px' }}>smart_toy</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>Asistente de Reservas AI</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary-container)' }}></span> En línea y listo para agendar
                  </div>
                </div>
              </div>
              <button style={{ color: 'var(--on-surface-variant)', border: 'none', background: 'transparent' }}><span className="material-symbols-outlined">more_vert</span></button>
            </div>

            <div id="chat-messages" className="chat-messages" style={{ flex: 1, background: 'var(--background)' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--on-primary)' }}>smart_toy</span>
                </div>
                <div className="chat-bubble bot">Hola, soy el asistente virtual de Intecnia. Veo que te interesa una consulta con el Dr. Roberto Silva. ¿Para qué fecha estabas buscando?</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div className="chat-bubble user">Necesito una asesoría para la próxima semana, preferiblemente el lunes por la mañana.</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--on-primary)' }}>smart_toy</span>
                </div>
                <div className="chat-bubble bot">Revisando la agenda del Dr. Silva en tiempo real... Tengo estos horarios disponibles para el lunes:</div>
              </div>
            </div>

            <div className="chat-input-area">
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem' }}>
                <input id="chat-input" type="text" placeholder="Escribe tu mensaje..." style={{ flex: 1, background: 'transparent', fontSize: '0.875rem', padding: '0.375rem 0', border: 'none', outline: 'none' }} />
                <button id="chat-send" style={{ color: 'var(--primary-container)', border: 'none', background: 'transparent' }}><span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>send</span></button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>lock</span> Chat seguro encriptado
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
