import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';


// Formatea una fecha relativa: "hace 2 min", "ayer", etc.
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ayer';
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function Avatar({ user, size = 40 }) {
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return user?.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: size * 0.35, fontWeight: 700, color: 'var(--secondary)', fontFamily: 'Manrope' }}>
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ChatWindow({ initialReceiverId, initialReceiverName }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [newChatId, setNewChatId] = useState(initialReceiverId || null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Si viene un receiverId externo (desde perfil de un profesional), seleccionar directamente
  useEffect(() => {
    if (initialReceiverId && user?.id) {
      const convId = [user.id, initialReceiverId].sort().join('_');
      setSelectedConvId(convId);
      setSelectedContact({ id: initialReceiverId, name: initialReceiverName || 'Contacto', avatarUrl: null });
    }
  }, [initialReceiverId, user?.id]);

  // ── Lista de Conversaciones (polling cada 5s) ──────────────────────────────
  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch('/api/messages/conversations'),
    refetchInterval: 5000,
    enabled: !!user,
  });

  // ── Historial del chat activo (polling cada 3s) ────────────────────────────
  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', selectedConvId],
    queryFn: () => apiFetch(`/api/messages/${selectedConvId}`),
    refetchInterval: 3000,
    enabled: !!selectedConvId,
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']); // actualizar badges de leídos
    },
  });

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Enviar Mensaje ─────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (content) =>
      apiFetch('/api/messages', { method: 'POST', body: JSON.stringify({ receiverId: selectedContact?.id, content }) }),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries(['messages', selectedConvId]);
      queryClient.invalidateQueries(['conversations']);
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = messageInput.trim();
    if (!trimmed || !selectedContact || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConvId(conv.conversationId);
    setSelectedContact(conv.contact);
    setNewChatId(null);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div style={{ display: 'flex', height: '70vh', minHeight: '500px', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--outline-variant)', boxShadow: 'var(--ambient-shadow)' }}>

      {/* ── Panel Izquierdo: Lista de Conversaciones ─────────────────────────── */}
      <aside style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', background: 'var(--surface-container-low)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--outline-variant)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
              Mensajes
              {totalUnread > 0 && (
                <span style={{ marginLeft: '0.5rem', background: 'var(--error)', color: 'white', fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)' }}>
                  {totalUnread}
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {loadingConvs ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', color: 'var(--secondary)' }}>progress_activity</span>
            </div>
          ) : conversations.length === 0 && !newChatId ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--on-surface-variant)', display: 'block', marginBottom: '0.75rem' }}>forum</span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>Aún no tienes conversaciones. Inicia un chat desde el perfil de un profesional.</p>
            </div>
          ) : (
            <>
              {/* Si hay un nuevo chat que aún no tiene historial, mostrarlo primero */}
              {newChatId && selectedContact && !conversations.some(c => c.contact.id === newChatId) && (
                <button
                  onClick={() => handleSelectConversation({ conversationId: selectedConvId, contact: selectedContact })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'var(--secondary-container)', marginBottom: '0.25rem' }}
                >
                  <Avatar user={selectedContact} size={42} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedContact.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontStyle: 'italic' }}>Nueva conversación</p>
                  </div>
                </button>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.conversationId}
                  onClick={() => handleSelectConversation(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem',
                    borderRadius: 'var(--radius-lg)', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: selectedConvId === conv.conversationId ? 'var(--secondary-container)' : 'transparent',
                    transition: 'background 0.15s',
                    marginBottom: '0.125rem',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar user={conv.contact} size={42} />
                    {conv.unreadCount > 0 && (
                      <span style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '50%', border: '2px solid white' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: conv.unreadCount > 0 ? 700 : 600, fontSize: '0.875rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                        {conv.contact.name}
                      </p>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                        {timeAgo(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: conv.unreadCount > 0 ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: conv.unreadCount > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.lastMessage.isMine ? 'Tú: ' : ''}{conv.lastMessage.content}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* ── Panel Derecho: Ventana de Chat ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        {!selectedConvId ? (
          // Estado vacío — ninguna conversación seleccionada
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '56px' }}>mark_unread_chat_alt</span>
            <p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: '1rem' }}>Selecciona una conversación</p>
            <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>o inicia un chat desde el perfil de un profesional.</p>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--surface-container-low)' }}>
              <Avatar user={selectedContact} size={38} />
              <div>
                <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--primary)' }}>{selectedContact?.name}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                  {loadingMsgs ? 'Cargando...' : `${messages.length} mensajes`}
                </p>
              </div>
            </div>

            {/* Burbujas de mensajes */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {loadingMsgs && messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', color: 'var(--secondary)', fontSize: '32px' }}>progress_activity</span>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'var(--on-surface-variant)' }}>waving_hand</span>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>¡Sé el primero en escribir!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '0.625rem 1rem',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMine ? 'var(--primary)' : 'var(--surface-container)',
                        color: isMine ? 'var(--on-primary)' : 'var(--on-surface)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      }}>
                        {msg.content}
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem', marginLeft: isMine ? 0 : '0.25rem', marginRight: isMine ? '0.25rem' : 0 }}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        {isMine && (
                          <span className="material-symbols-outlined" style={{ fontSize: '12px', marginLeft: '3px', color: msg.read ? 'var(--secondary)' : 'var(--on-surface-variant)', verticalAlign: 'middle' }}>
                            {msg.read ? 'done_all' : 'done'}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensaje */}
            <form onSubmit={handleSend} style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--outline-variant)', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', background: 'var(--surface-container-low)' }}>
              <textarea
                ref={inputRef}
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje... (Enter para enviar)"
                rows={1}
                style={{
                  flex: 1, padding: '0.75rem 1rem', background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)', borderRadius: 'var(--radius-lg)',
                  color: 'var(--on-surface)', fontSize: '0.9375rem', resize: 'none', outline: 'none',
                  fontFamily: 'Manrope', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
                onBlur={e => e.target.style.borderColor = 'var(--outline-variant)'}
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || sendMutation.isPending}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: messageInput.trim() ? 'var(--secondary)' : 'var(--surface-container)',
                  color: messageInput.trim() ? 'white' : 'var(--on-surface-variant)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}
              >
                {sendMutation.isPending
                  ? <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  : <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>send</span>
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
