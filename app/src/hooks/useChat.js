import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../lib/api';
import { getGreeting, getLocalResponse } from '../lib/professionalKnowledge';

/**
 * Hook de chat conectado a la API real de messages (/api/messages).
 * Carga historial existente y envia mensajes a BD cuando aplica.
 */
export function useChat(professionalName, receiverId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const conversationId = useMemo(() => {
    if (!user?.id || !receiverId) return null;
    return [user.id, receiverId].sort().join('_');
  }, [user?.id, receiverId]);

  useEffect(() => {
    if (!conversationId || hasFetched) return;

    const loadHistory = async () => {
      try {
        setIsTyping(true);
        const data = await apiFetch(`/messages/${conversationId}`);
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((m) => ({
            id: m.id,
            sender: m.senderId === user.id ? 'user' : 'bot',
            text: m.content,
            timestamp: new Date(m.createdAt),
          }));
          setMessages(formatted);
        } else {
          setMessages([{ id: 'greeting', sender: 'bot', text: getGreeting(professionalName), timestamp: new Date() }]);
        }
      } catch {
        setMessages([{ id: 'greeting', sender: 'bot', text: getGreeting(professionalName), timestamp: new Date() }]);
      } finally {
        setIsTyping(false);
        setHasFetched(true);
      }
    };

    loadHistory();
  }, [conversationId, hasFetched, professionalName, user?.id]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;

      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const canPersist = Boolean(user?.id && receiverId && user.id !== receiverId);
      if (canPersist) {
        setIsTyping(true);
        try {
          const saved = await apiFetch('/messages', {
            method: 'POST',
            body: JSON.stringify({ receiverId, content: text }),
          });

          setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, id: saved.id } : m)));
        } catch {
          setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? { ...m, failed: true } : m)));
        } finally {
          setIsTyping(false);
        }
      }

      setIsTyping(true);
      let botText = getLocalResponse(professionalName, text);
      const lastBot = [...messages].reverse().find((m) => m.sender === 'bot');
      if (lastBot && lastBot.text === botText) {
        botText = 'Perfecto. Para avanzar, selecciona un horario disponible y te ayudo a cerrar la cita.';
      }

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: botText,
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
      }, 650);
    },
    [user, receiverId, professionalName, messages]
  );

  return { messages, sendMessage, isTyping };
}
