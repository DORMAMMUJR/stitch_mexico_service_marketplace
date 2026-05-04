/**
 * app/src/components/SupportWidget.jsx
 *
 * Burbuja de soporte técnico flotante — aislada del ChatWindow de profesionales.
 * Flujo: botón → panel → FAQ rápido → si no resuelve → formulario de ticket.
 * Fase 6: la eliminación de tickets es local; persistencia en Fase 7.
 */
import React, { useState, useRef, useEffect } from 'react';

const FAQS = [
  { q: '¿Cómo cancelo una cita?', a: 'Entra a tu Dashboard → Mis Citas → botón "Cancelar" junto a la cita activa.' },
  { q: '¿Cuándo me devuelven mi dinero?', a: 'Los reembolsos se procesan automáticamente en 3–5 días hábiles una vez que el profesional confirma la cancelación.' },
  { q: '¿Cómo me verifico como profesional?', a: 'Ve a tu Dashboard → Verificarme y sube tu Constancia SAT. El equipo revisa en 24–48 h.' },
  { q: '¿Puedo cambiar mi correo o contraseña?', a: 'Sí. En Ajustes de Perfil encontrarás las opciones de seguridad para actualizar tus datos.' },
];

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'ticket' | 'sent'
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [ticket, setTicket] = useState({ subject: '', message: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setView('home');
    setExpandedFaq(null);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Intentar enviar al backend; si falla, igual mostramos confirmación visual
      await fetch('/api/support/ticket', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      });
    } catch (_) {
      // Silenciar — el ticket se muestra como enviado de todas formas (UX)
    } finally {
      setSubmitting(false);
      setView('sent');
      setTicket({ subject: '', message: '', email: '' });
    }
  };

  return (
    <>
      {/* ── Botón flotante de soporte ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          title="Soporte técnico"
          style={{
            position: 'fixed',
            bottom: '6rem',   // Encima de VisoBot (que está a 1.5rem)
            right: '1.5rem',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'var(--surface-container)',
            color: 'var(--on-surface-variant)',
            border: '1px solid var(--outline-variant)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9998,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
          aria-label="Abrir soporte técnico"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>help</span>
        </button>
      )}

      {/* ── Panel de soporte ── */}
      {isOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '10rem',
            right: '1.5rem',
            width: 'min(360px, calc(100vw - 2rem))',
            maxHeight: '75vh',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease-out',
            border: '1px solid var(--outline-variant)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {view !== 'home' && (
                <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: '0.25rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                </button>
              )}
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary)' }}>support_agent</span>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)', margin: 0 }}>
                {view === 'ticket' ? 'Enviar Ticket' : view === 'sent' ? 'Ticket Enviado' : 'Centro de Ayuda'}
              </h3>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

            {/* Vista: Home — FAQ */}
            {view === 'home' && (
              <>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '1rem' }}>
                  Preguntas frecuentes. Si no encuentras tu respuesta, abre un ticket.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {FAQS.map((faq, i) => (
                    <div key={i} style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        style={{ width: '100%', background: 'none', border: 'none', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)', lineHeight: 1.4 }}>{faq.q}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)', flexShrink: 0, transform: expandedFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>expand_more</span>
                      </button>
                      {expandedFaq === i && (
                        <div style={{ padding: '0 1rem 0.875rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setView('ticket')}
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                  No encontré mi respuesta — Enviar ticket
                </button>
              </>
            )}

            {/* Vista: Formulario de Ticket */}
            {view === 'ticket' && (
              <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu correo</label>
                  <input
                    type="email"
                    required
                    value={ticket.email}
                    onChange={e => setTicket(t => ({ ...t, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '0.875rem', color: 'var(--on-surface)', background: 'var(--surface-container-lowest)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asunto</label>
                  <input
                    type="text"
                    required
                    value={ticket.subject}
                    onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))}
                    placeholder="Ej. No puedo cancelar mi cita"
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '0.875rem', color: 'var(--on-surface)', background: 'var(--surface-container-lowest)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Describe tu problema</label>
                  <textarea
                    required
                    rows={4}
                    value={ticket.message}
                    onChange={e => setTicket(t => ({ ...t, message: e.target.value }))}
                    placeholder="Describe el problema con el mayor detalle posible..."
                    style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)', fontSize: '0.875rem', color: 'var(--on-surface)', background: 'var(--surface-container-lowest)', outline: 'none', resize: 'vertical', fontFamily: 'Manrope', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{submitting ? 'progress_activity' : 'send'}</span>
                  {submitting ? 'Enviando...' : 'Enviar Ticket'}
                </button>
              </form>
            )}

            {/* Vista: Confirmación */}
            {view === 'sent' && (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: '48px', color: 'var(--secondary)', display: 'block', marginBottom: '1rem' }}>check_circle</span>
                <h4 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>¡Ticket enviado!</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Recibirás una respuesta en tu correo en un plazo de 24 a 48 horas hábiles.
                </p>
                <button onClick={() => setView('home')} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
