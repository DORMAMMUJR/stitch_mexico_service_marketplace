import { useState, useCallback } from 'react';
import { getGreeting, getLocalResponse } from '../lib/professionalKnowledge';

/**
 * Hook de chat con sistema de 2 niveles:
 * 1. OpenAI API     → Vía backend seguro (/api/chat)
 * 2. Mensaje simple → Si el backend falla, respuesta local
 */
export function useChat(professionalName) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: getGreeting(professionalName),
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      let reply = null;

      // ─── Nivel 1: OpenAI via backend ───────────────────────────────────
      try {
        const history = messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
        history.push({ sender: 'user', text });

        const res = await fetch(`/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            professional: professionalName,
            history,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.output || data.message;
        }
      } catch (e) {
        console.warn("Backend AI falló:", e);
      }

      // ─── Nivel 2: Respuesta local de último recurso ────────────────────
      if (!reply) {
        reply = getLocalResponse(professionalName, text);
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: reply, timestamp: new Date() },
      ]);

    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Lo siento, tuve un problema al conectarme. Por favor intenta de nuevo en unos momentos.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [professionalName, messages]);

  return { messages, sendMessage, isTyping };
}
