import React from 'react';
import { NavbarIntecnia } from '../components/NavbarIntecnia';
import { Footer } from '../components/Footer';

export function TermsPage() {
  return (
    <>
      <NavbarIntecnia />
      <main className="container" style={{ padding: '4rem 1.5rem', maxWidth: '800px', minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Terminos de Servicio</h1>
        <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
          Ultima actualizacion: 1 de Mayo de 2026.
        </p>

        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>1. Aceptacion de los Terminos</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Al acceder y utilizar la plataforma Intecnia, usted acepta estar sujeto a estos terminos y condiciones. Si no esta de acuerdo con alguna parte de los terminos, no podra utilizar nuestros servicios.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>2. Descripcion del Servicio</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Intecnia proporciona una plataforma digital que conecta a clientes con profesionales verificados. No somos proveedores de los servicios ofrecidos por los profesionales, actuamos unicamente como facilitador y procesador de pagos.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>3. Verificacion Profesional</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            Todos los profesionales estan sujetos a un proceso de verificacion documental mediante INE y Cedula profesional. Sin embargo, la responsabilidad final sobre la calidad del servicio recae en el profesional contratado.
          </p>

          <h2 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '1rem' }}>4. Pagos y proteccion</h2>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Las citas pueden requerir anticipo o pago completo antes de confirmar el horario. La plataforma puede cobrar una comision de servicio visible en el resumen de pago; dicha comision cubre procesamiento, operacion y proteccion de la transaccion.
          </p>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Los reembolsos se revisan segun el momento de cancelacion, evidencia disponible y estado del servicio. Como regla operativa, las cancelaciones con mas de 24 horas pueden aplicar a reembolso del servicio; dentro de 24 horas, servicio iniciado, no-show o conflicto entre partes requieren revision administrativa.
          </p>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '1rem' }}>
            Las disputas deben abrirse dentro de las 72 horas posteriores al servicio o incidente reportado. Intecnia puede retener fondos mientras revisa comprobantes, mensajes, asistencia y evidencia enviada por cliente y profesional.
          </p>
          <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.8, marginBottom: '0' }}>
            El cliente recibira comprobante digital del pago confirmado. La factura fiscal, cuando aplique, debera solicitarse con los datos fiscales correspondientes. En caso de no-show, los fondos quedan retenidos hasta revision y resolucion administrativa.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
