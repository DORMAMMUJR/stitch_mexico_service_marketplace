import React from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function SupportPage() {
  const openSupportBot = () => {
    const botBtn = document.querySelector('[data-viso-trigger]');
    if (botBtn) botBtn.click();
  };

  return (
    <>
      <NavbarIntecnia />
      <main className="container" style={{ padding: '4rem 1.5rem', maxWidth: '800px', minHeight: '60vh', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--secondary)', marginBottom: '1rem' }}>support_agent</span>
        <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1rem' }}>Centro de Soporte Elite</h1>
        <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '3rem', maxWidth: '600px', marginInline: 'auto' }}>
          Estamos aquí para ayudarle. Encuentre respuestas a preguntas frecuentes o póngase en contacto directo con nuestro equipo de asistencia.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--primary)', marginBottom: '1rem' }}>chat</span>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>Chat en Vivo</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Resolución inmediata para problemas urgentes en su cuenta.</p>
            <button onClick={openSupportBot} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Iniciar Chat</button>
          </div>
          <div className="card" style={{ padding: '2rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--primary)', marginBottom: '1rem' }}>mail</span>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>Correo de Soporte</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Para temas complejos, escribe a soporte@intecnia.mx.</p>
            <a className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }} href="mailto:soporte@intecnia.mx">Escribir correo</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
