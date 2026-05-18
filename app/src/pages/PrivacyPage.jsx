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
          En Intecnia, su privacidad es nuestra prioridad. Cumplimos estrictamente con la Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares.
        </p>
        <div style={{ background: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)', padding: '2rem', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Recopilacion de Datos</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Recopilamos informacion personal (nombre, correo, datos fiscales y biometricos) unicamente con el fin de verificar su identidad y garantizar la seguridad dentro del ecosistema de la plataforma.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Datos sensibles de salud</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Por tratarse de una plataforma de Psicologia, Medicina y Bienestar, cualquier dato de salud se considera sensible y requiere consentimiento expreso. El chat general no debe usarse como expediente clinico. La informacion medica sensible se separa en canales marcados para ese fin y no sustituye una consulta, diagnostico, receta ni tratamiento.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Seguridad y Cifrado</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Sus datos estan protegidos utilizando cifrado AES-256 tanto en transito como en reposo. Intecnia no vende, alquila ni comparte su informacion con terceros para fines publicitarios.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>Derechos ARCO</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '0' }}>
            Usted puede ejercer en cualquier momento sus derechos de Acceso, Rectificacion, Cancelacion u Oposicion contactando a nuestro equipo de soporte.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
