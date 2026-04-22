import React from 'react';
import { Link } from 'react-router-dom';
import { NavbarKonectia } from '../components/NavbarKonectia';
import { Footer } from '../components/Footer';
import { NotifBanner } from '../components/NotifBanner';

export function ProfilePage() {
  return (
    <>
      <NotifBanner />
      <NavbarKonectia />

      <div className="container" style={{ padding: '2rem 1.5rem 4rem', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Profile Card */}
          <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=180&fit=crop&crop=face" alt="Ing. Ricardo Mendoza" style={{ width: '9rem', height: '10rem', borderRadius: 'var(--radius-xl)', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h1 style={{ fontFamily: 'Manrope', fontSize: '2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>Ing. Ricardo Mendoza</h1>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem', marginBottom: '1rem' }}>Especialista en Consultoría Industrial & Optimización</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>fingerprint</span> BIOMETRIC VERIFIED</span>
                  <span className="badge"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>account_balance</span> SAT COMPLIANT</span>
                </div>
                <span className="badge badge-cyan"><span className="material-symbols-outlined icon-filled" style={{ fontSize: '14px' }}>verified</span> CONOCER CERTIFIED</span>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Sobre Mí</h2>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.7, marginBottom: '2rem' }}>
              Con más de 15 años de experiencia en la optimización de procesos industriales, mi enfoque se centra en la integración tecnológica y la eficiencia operativa. He asesorado a más de 50 plantas de manufactura en México, logrando reducciones de costos operativos de hasta un 25% mediante metodologías Lean y análisis predictivo.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem' }}>
              {[
                { val: '15+', label: 'AÑOS EXP.' },
                { val: '50+', label: 'PLANTAS ASESORADAS' },
                { val: '25%', label: 'REDUCCIÓN COSTOS' },
                { val: '4.9', label: '★ RATING' },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontFamily: 'Manrope', fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{s.val}</p>
                  <p className="text-label-md" style={{ textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio */}
          <h2 className="text-headline-md" style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Portafolio Destacado</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: '200px', cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop" alt="Automatización" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', color: 'var(--on-primary)' }}>
                <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--secondary-container)', fontWeight: 600 }}>MANUFACTURA AUTOMOTRIZ</span>
                <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>Automatización Planta Monterrey</h4>
              </div>
            </div>
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', position: 'relative', height: '200px', cursor: 'pointer' }}>
              <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop" alt="Logística" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,3,10,0.8) 30%,transparent)' }}></div>
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', color: 'var(--on-primary)' }}>
                <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--secondary-container)', fontWeight: 600 }}>CADENA DE SUMINISTRO</span>
                <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>Optimización Logística CDMX</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Chat */}
        <div className="card" style={{ position: 'sticky', top: '5rem', display: 'flex', flexDirection: 'column', height: '560px' }}>
          <div style={{ padding: '1.25rem', background: 'var(--primary)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary-container)' }}>smart_toy</span>
            </div>
            <div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-primary)' }}>Asistente de Reservas AI</h3>
              <p style={{ fontSize: '0.6875rem', color: 'var(--primary-fixed-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AGENDANDO CONSULTORÍA INDUSTRIAL</p>
            </div>
          </div>

          <div id="chat-messages" className="chat-messages" style={{ flex: 1, background: 'var(--background)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(45,188,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>smart_toy</span>
              </div>
              <div className="chat-bubble bot">Hola. Soy el asistente del Ing. Ricardo Mendoza. He revisado su solicitud para una "Consultoría Industrial". ¿Le parece bien agendar una videollamada inicial de 45 minutos?</div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
              <div className="chat-bubble user">Sí, me parece perfecto. ¿Qué disponibilidad tiene la próxima semana?</div>
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(45,188,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>smart_toy</span>
              </div>
              <div>
                <div className="chat-bubble bot" style={{ marginBottom: '0.5rem' }}>El ingeniero tiene los siguientes espacios disponibles para la próxima semana:</div>
                <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(197,198,206,0.2)', borderRadius: 'var(--radius-lg)', padding: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.375rem', background: 'rgba(45,188,254,0.06)', border: '1px solid rgba(45,188,254,0.2)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Lunes 24 de Mayo</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary)' }}>10:00 AM</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Martes 25 de Mayo</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>4:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="chat-input-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem' }}>
              <input id="chat-input" type="text" placeholder="El chat ha finalizado..." style={{ flex: 1, background: 'transparent', fontSize: '0.875rem', padding: '0.375rem 0', border: 'none', outline: 'none' }} />
              <button id="chat-send" style={{ color: 'var(--secondary)', padding: '0.25rem', border: 'none', background: 'transparent' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
