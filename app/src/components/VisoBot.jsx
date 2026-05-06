import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const SYSTEM_PROMPT = `Eres VISO, asistente de conversión para Intecnia.
Reglas estrictas:
1) Tu único objetivo es llevar al usuario a agendar una cita.
2) No recomiendes "el mejor" profesional ni des opiniones personales.
3) Nunca repitas la misma pregunta dos veces.
4) Responde en máximo 2 frases y siempre termina con una acción concreta.
5) Si piden algo fuera de alcance, redirige a Directorio o Agendar Cita.`;

const QUICK_SERVICES = [
  'Psicología',
  'Asesoría Legal',
  'Contabilidad',
  'Soporte Técnico',
];

export function VisoBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [service, setService] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef(null);

  const addBotMessage = (text, options = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender: 'bot', text, options }]);
    }, 300);
  };

  const addUserMessage = (text) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), sender: 'user', text }]);
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen || messages.length > 0) return;
    addBotMessage(
      'Hola, soy VISO. Te ayudo a agendar tu cita en menos de 1 minuto. ¿Qué servicio necesitas?',
      QUICK_SERVICES.map((s) => ({ label: s, value: `service:${s}` }))
    );
  }, [isOpen, messages.length]);

  const routeToDirectory = (query) => {
    navigate(`/directory?q=${encodeURIComponent(query || service || '')}`);
    setIsOpen(false);
  };

  const routeToAppointments = () => {
    if (!user) {
      navigate('/register');
      setIsOpen(false);
      return;
    }
    navigate(user.role === 'PROFESSIONAL' ? '/dashboard?tab=appointments' : '/mis-solicitudes');
    setIsOpen(false);
  };

  const handleServiceSelection = (selectedService) => {
    const clean = selectedService.trim();
    setService(clean);
    addBotMessage(
      `Perfecto. Siguiente paso: abrir directorio para ${clean} y elegir horario disponible.`,
      [
        { label: 'Abrir directorio ahora', value: 'go:directory' },
        { label: user ? 'Ir a mis citas' : 'Crear cuenta y agendar', value: 'go:book' },
      ]
    );
  };

  const handleInputSubmit = (text) => {
    const value = text.trim();
    if (!value) return;
    addUserMessage(value);

    const normalized = value.toLowerCase();
    const outOfScope = normalized.includes('mejor') || normalized.includes('recomienda') || normalized.includes('opinion');

    if (outOfScope) {
      addBotMessage(
        'No doy recomendaciones personales. Te llevo al directorio para que agendes con el perfil que prefieras.',
        [
          { label: 'Ir al directorio', value: 'go:directory' },
          { label: user ? 'Ir a mis citas' : 'Crear cuenta y agendar', value: 'go:book' },
        ]
      );
      return;
    }

    handleServiceSelection(value);
  };

  const handleOptionSelect = (option) => {
    if (option.value.startsWith('service:')) {
      const selected = option.value.replace('service:', '');
      addUserMessage(selected);
      handleServiceSelection(selected);
      return;
    }

    addUserMessage(option.label);
    if (option.value === 'go:directory') {
      addBotMessage('Listo. Te abro el directorio para continuar con tu cita.');
      setTimeout(() => routeToDirectory(service), 450);
      return;
    }

    if (option.value === 'go:book') {
      addBotMessage('Listo. Te llevo a tu panel para cerrar la cita.');
      setTimeout(() => routeToAppointments(), 450);
    }
  };

  const renderBubble = (msg) => (
    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
      <div
        style={{
          maxWidth: '85%',
          padding: '0.75rem 1rem',
          borderRadius: '1rem',
          borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '1rem',
          borderBottomRightRadius: msg.sender === 'user' ? '4px' : '1rem',
          background: msg.sender === 'bot' ? 'var(--surface-container-low)' : 'var(--primary)',
          color: msg.sender === 'bot' ? 'var(--on-surface)' : 'var(--on-primary)',
          fontSize: '0.9375rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.text}
      </div>

      {msg.options && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', alignItems: 'flex-start' }}>
          {msg.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleOptionSelect(opt)}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderRadius: 'var(--radius-full)', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="visobot-widget"
          data-viso-trigger="true"
          aria-label="Abrir asistente Viso"
          title={SYSTEM_PROMPT}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: '4rem',
            height: '4rem',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'var(--on-primary)',
            border: 'none',
            boxShadow: '0 8px 24px rgba(6,78,59,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>smart_toy</span>
        </button>
      )}

      {isOpen && (
        <div
          className="visobot-chat-panel"
          style={{
            position: 'fixed',
            bottom: '6.5rem',
            right: '1.5rem',
            width: 'min(380px, calc(100vw - 2rem))',
            height: 'min(600px, 75vh)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1.25rem', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', margin: 0 }}>VISO</h3>
              <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.8 }}>Agendar cita</p>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--on-primary)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--surface-container-lowest)' }}>
            {messages.map(renderBubble)}
            {isTyping && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container-low)', borderRadius: '1rem', width: 'fit-content' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Escribiendo...</span>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--outline-variant)', background: 'var(--surface)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInputSubmit(inputValue);
                setInputValue('');
              }}
              style={{ display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="text"
                placeholder="Describe el servicio que necesitas"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)', outline: 'none' }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--secondary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !inputValue.trim() ? 0.5 : 1 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
