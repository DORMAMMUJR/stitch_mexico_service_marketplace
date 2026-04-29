import React from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function PrivacyPage() {
  return (
    <>
      <NavbarIntecnia />
      <main className="container" style={{ padding: '4rem 1.5rem', maxWidth: '800px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--secondary)' }}>security</span>
          <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '2.5rem', color: 'var(--primary)' }}>Aviso de Privacidad</h1>
        </div>
        <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
          En Intecnia, su privacidad es nuestra prioridad. Cumplimos estrictamente con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.
        </p>
        <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Recopilación de Datos</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Recopilamos información personal (nombre, correo, datos fiscales y biométricos) únicamente con el fin de verificar su identidad y garantizar la seguridad dentro del ecosistema de la plataforma.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Seguridad y Cifrado</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Sus datos están protegidos utilizando cifrado AES-256 tanto en tránsito como en reposo. Intecnia no vende, alquila ni comparte su información con terceros para fines publicitarios.
          </p>
          
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Derechos ARCO</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '0' }}>
            Usted puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación u Oposición contactando a nuestro equipo de soporte.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
