import { useState, useCallback } from 'react';
import { hasVisoEnabled, getGreeting } from '../lib/professionalKnowledge';

/**
 * Hook de chat con sistema de 3 niveles:
 * 1. VISO (n8n)     → Si el profesional tiene visoEnabled: true
 * 2. OpenAI API     → Fallback general vía backend seguro
 * 3. Mensaje simple → Si el backend también falla
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

      // ─── Nivel 1: VISO / n8n (profesionales con integración completa) ───
      if (hasVisoEnabled(professionalName)) {
        const WEBHOOK_URL = import.meta.env.VITE_VISO_WEBHOOK_URL;
        if (WEBHOOK_URL) {
          const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: text,
              professional: professionalName,
              sessionId: `web-${professionalName?.replace(/\s+/g, '-').toLowerCase()}`,
              source: 'web_profile',
              timestamp: new Date().toISOString(),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            reply = data.output || data.message || data.text;
          }
        }
      }

      // ─── Nivel 2: OpenAI via backend (fallback para todos los demás) ───
      if (!reply) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        // Pasar las últimas 6 interacciones como historial de contexto
        const history = messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
        history.push({ sender: 'user', text }); // incluir el mensaje actual

        const res = await fetch(`${API_URL}/chat`, {
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
      }

      // ─── Nivel 3: Mensaje genérico de último recurso ───
      if (!reply) {
        reply = `Gracias por tu mensaje. El equipo de ${professionalName || 'este profesional'} te contactará pronto para darte toda la información.`;
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
