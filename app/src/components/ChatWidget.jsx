import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export function ChatWidget({ professionalName }) {
  const { messages, sendMessage, isTyping } = useChat(professionalName);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="card" style={{ position: 'sticky', top: '5rem', display: 'flex', flexDirection: 'column', height: '560px' }}>
      <div style={{ padding: '1.25rem', background: 'var(--primary)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--secondary-container)' }}>smart_toy</span>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--on-primary)' }}>Asistente de Reservas AI</h3>
          <p style={{ fontSize: '0.6875rem', color: 'var(--primary-fixed-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AGENDANDO CON {professionalName?.toUpperCase() || 'PROFESIONAL'}</p>
        </div>
      </div>

      <div id="chat-messages" className="chat-messages" style={{ flex: 1, background: 'var(--background)', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.sender === 'bot' && (
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(45,188,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>smart_toy</span>
              </div>
            )}
            <div className={`chat-bubble ${msg.sender}`} style={{ 
              maxWidth: '80%', 
              padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-lg)', 
              fontSize: '0.875rem',
              background: msg.sender === 'bot' ? 'var(--surface-container-low)' : 'var(--secondary)',
              color: msg.sender === 'bot' ? 'var(--on-surface)' : 'white',
              borderBottomRightRadius: msg.sender === 'user' ? '4px' : 'var(--radius-lg)',
              borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : 'var(--radius-lg)',
            }}>
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'rgba(45,188,254,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--secondary)' }}>smart_toy</span>
            </div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', borderBottomLeftRadius: '4px' }}>
              <div className="typing-indicator" style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '4px', height: '4px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                <div style={{ width: '4px', height: '4px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                <div style={{ width: '4px', height: '4px', background: 'var(--secondary)', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area" style={{ padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 1rem' }}>
          <input 
            type="text" 
            placeholder="Escribe un mensaje..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1, background: 'transparent', fontSize: '0.875rem', padding: '0.375rem 0', border: 'none', outline: 'none' }} 
          />
          <button 
            onClick={handleSend}
            style={{ color: 'var(--secondary)', padding: '0.25rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '20px' }}>send</span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
