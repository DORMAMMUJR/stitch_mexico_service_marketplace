import React from 'react';
import NavbarIntecnia from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function TermsPage() {
  return (
    <>
      <NavbarIntecnia />
      <main className="container" style={{ padding: '4rem 1.5rem', maxWidth: '800px', minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Términos de Servicio</h1>
        <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
          Última actualización: 1 de Mayo de 2026.
        </p>
        
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>1. Aceptación de los Términos</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Al acceder y utilizar la plataforma Intecnia, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de los términos, no podrá utilizar nuestros servicios.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>2. Descripción del Servicio</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Intecnia proporciona una plataforma digital que conecta a clientes con profesionales verificados. No somos proveedores de los servicios ofrecidos por los profesionales, actuamos únicamente como un facilitador y procesador de pagos.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>3. Verificación Profesional</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '0' }}>
            Todos los profesionales están sujetos a un proceso de verificación (Biometría, SAT, CONOCER). Sin embargo, la responsabilidad final sobre la calidad del servicio recae en el profesional contratado.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
