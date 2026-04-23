import { useState, useCallback } from 'react';

export function useChat(professionalName) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `Hola. Soy el asistente de ${professionalName || 'este profesional'}. ¿En qué puedo ayudarte hoy?`,
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Añadir mensaje del usuario
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true); // ← Activa el indicador "escribiendo..."

    // Conexión con n8n / VISO
    try {
      const WEBHOOK_URL = import.meta.env.VITE_VISO_WEBHOOK_URL;
      if (!WEBHOOK_URL) throw new Error('VITE_VISO_WEBHOOK_URL no configurado');

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          professional: professionalName,
          sessionId: `web-${professionalName?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
          source: 'web_profile',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.output || data.message || data.text || `Gracias por tu mensaje. El equipo de ${professionalName} te responderá pronto.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('VISO Error:', err);
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
      setIsTyping(false); // ← Siempre apaga el indicador
    }
  }, [professionalName]);

  return { messages, sendMessage, isTyping };
}
