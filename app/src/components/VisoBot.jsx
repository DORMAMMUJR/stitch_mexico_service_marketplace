import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function VisoBot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('greeting');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [service, setService] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const addBotMessage = (text, options = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text, options }]);
    }, 800);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text }]);
  };

  // Auto-scroll al contenedor, NO a window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Paso 1: Saludo al abrir
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage(
        '👋 Hola, soy Viso.\nTe ayudo a agendar con un profesional en minutos.\n¿Qué servicio estás buscando?'
      );
      setStep('service');
    }
  }, [isOpen]);

  // Paso 2: el usuario escribe qué busca
  const handleInputSubmit = (text) => {
    if (!text.trim()) return;
    addUserMessage(text);
    if (step === 'service') {
      setService(text);
      setStep('availability');
      addBotMessage(
        `🔍 Buscaré a los mejores en "${text}" para ti.`,
        [
          { label: 'Ver disponibilidad en el directorio', value: 'directory' },
          { label: user ? 'Ver mis citas' : 'Crear cuenta gratis', value: user ? 'dashboard' : 'register' },
        ]
      );
    }
  };

  // Paso 3 y 4: navegación por opciones del bot
  const handleOptionSelect = (option) => {
    addUserMessage(option.label);
    if (option.value === 'directory') {
      addBotMessage('👍 Te llevo ahora. ¡Hasta pronto!');
      setTimeout(() => {
        navigate(`/directory?q=${encodeURIComponent(service)}`);
        setIsOpen(false);
      }, 700);
    } else if (option.value === 'dashboard') {
      navigate(user?.role === 'PROFESSIONAL' ? '/dashboard' : '/mis-solicitudes');
      setIsOpen(false);
    } else if (option.value === 'register') {
      navigate('/register');
      setIsOpen(false);
    }
  };

  const [inputValue, setInputValue] = useState('');

  const renderBubble = (msg) => {
    // Basic markdown for bold
    const formatText = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', marginBottom: '1rem' }}>
            <div style={{
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '1rem',
                borderBottomRightRadius: msg.sender === 'user' ? '4px' : '1rem',
                background: msg.sender === 'bot' ? 'var(--surface-container-low)' : 'var(--primary)',
                color: msg.sender === 'bot' ? 'var(--on-surface)' : 'var(--on-primary)',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
            }}>
                {formatText(msg.text)}
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
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="visobot-widget"
          data-viso-trigger="true"
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
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          aria-label="Abrir asistente Viso"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>smart_toy</span>
        </button>
      )}

      {/* Ventana de chat */}
      {isOpen && (
        <div
          className="visobot-chat-panel"
          style={{
            position: 'fixed',
            bottom: '6.5rem',
            right: '1.5rem',
            width: 'min(380px, calc(100vw - 2rem))', /* Se adapta a pantallas pequeñas */
            height: 'min(600px, 75vh)',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'slideUp 0.3s ease-out'
          }}>
          {/* Header */}
          <div style={{ padding: '1.25rem', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                    <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', margin: 0 }}>Viso</h3>
                    <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.8 }}>Asistente Inteligente</p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--on-primary)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'var(--surface-container-lowest)' }}
          >
            {messages.map(renderBubble)}
            
            {isTyping && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container-low)', borderRadius: '1rem', borderBottomLeftRadius: '4px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                    <div style={{ width: '6px', height: '6px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                    <div style={{ width: '6px', height: '6px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {(step === 'greeting' || step === 'location') && (
            <div style={{ padding: '1rem', borderTop: '1px solid var(--outline-variant)', background: 'var(--surface)' }}>
                <form 
                    onSubmit={e => {
                        e.preventDefault();
                        handleInputSubmit(inputValue);
                        setInputValue('');
                    }}
                    style={{ display: 'flex', gap: '0.5rem' }}
                >
                    <input 
                        type="text" 
                        placeholder={step === 'greeting' ? "Ej. Psicólogo, Plomero..." : "Ej. Roma, CDMX..."}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--outline-variant)', outline: 'none' }}
                        autoFocus
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
          )}
        </div>
      )}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
