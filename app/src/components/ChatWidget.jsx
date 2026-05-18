import React, { memo, useCallback, useMemo, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { getSensitiveHealthChatNotice } from '../lib/chatAssistant';

/**
 * @typedef {'bot' | 'user'} ChatSender
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {ChatSender} sender
 * @property {string} text
 * @property {Date} timestamp
 */

const ChatHeader = memo(function ChatHeader({ professionalNameUpper }) {
  return (
    <header className="profile-chat-header profile-chat-header-content">
      <div className="profile-chat-header-avatar" aria-hidden="true">
        <span className="material-symbols-outlined profile-chat-header-avatar-icon">smart_toy</span>
      </div>
      <div className="profile-chat-header-title-wrap">
        <h3 className="profile-chat-title">Asistente de Reservas AI</h3>
        <p className="profile-chat-subtitle">AGENDANDO CON {professionalNameUpper}</p>
      </div>
    </header>
  );
});

const MessageRow = memo(function MessageRow({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`profile-chat-row ${isUser ? 'profile-chat-row-user' : ''}`}>
      {!isUser && (
        <div className="profile-chat-avatar profile-chat-avatar-bot" aria-hidden="true">
          <span className="material-symbols-outlined profile-chat-avatar-icon">smart_toy</span>
        </div>
      )}

      <div className={`profile-chat-bubble ${isUser ? 'profile-chat-bubble-user' : 'profile-chat-bubble-bot'}`}>
        {message.text}
      </div>

      {isUser && (
        <div className="profile-chat-avatar profile-chat-avatar-user" aria-hidden="true">
          <span className="material-symbols-outlined profile-chat-avatar-icon">person</span>
        </div>
      )}
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="profile-chat-row" aria-hidden="true">
      <div className="profile-chat-avatar profile-chat-avatar-bot">
        <span className="material-symbols-outlined profile-chat-avatar-icon">smart_toy</span>
      </div>
      <div className="profile-chat-typing-bubble">
        <div className="profile-chat-typing-indicator">
          <span className="profile-chat-typing-dot" />
          <span className="profile-chat-typing-dot" />
          <span className="profile-chat-typing-dot" />
        </div>
      </div>
    </div>
  );
});

const MessageList = memo(function MessageList({ messages, isTyping }) {
  return (
    <div
      id="chat-messages"
      className="chat-messages profile-chat-body profile-chat-log"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
    >
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
});

const ChatInput = memo(function ChatInput({
  value,
  disabled,
  onChange,
  onKeyDown,
  onSend,
}) {
  return (
    <div className="chat-input-area profile-chat-input-area">
      <div className="profile-chat-input-wrap">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          className="profile-chat-input-control"
          placeholder="Escribe un mensaje..."
          aria-label="Escribe un mensaje"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={disabled}
          className="profile-chat-send-button"
          aria-label="Enviar mensaje"
        >
          <span className="material-symbols-outlined icon-filled" aria-hidden="true">send</span>
        </button>
      </div>
    </div>
  );
});

/**
 * @param {{ professionalName?: string; professionalId?: string }} props
 */
export function ChatWidget({ professionalName, professionalId }) {
  const { messages, sendMessage, isTyping } = useChat(professionalName, professionalId);
  const [inputValue, setInputValue] = useState('');
  const professionalNameUpper = useMemo(
    () => professionalName?.toUpperCase() || 'PROFESIONAL',
    [professionalName]
  );
  const isSendDisabled = !inputValue.trim();

  // Callback estable: evita recrear handlers en hijos memoizados.
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue('');
  }, [inputValue, sendMessage]);

  const handleInputChange = useCallback((event) => {
    setInputValue(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <section className="card glass-card profile-chat-widget profile-chat-shell profile-chat-root" aria-label="Chat con asistente">
      <ChatHeader professionalNameUpper={professionalNameUpper} />
      <div className="profile-chat-health-notice">
        {getSensitiveHealthChatNotice()}
      </div>
      {/* Lista separada para evitar re-render al teclear en el input. */}
      <MessageList messages={messages} isTyping={isTyping} />
      <ChatInput
        value={inputValue}
        disabled={isSendDisabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
      />
    </section>
  );
}
