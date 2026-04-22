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

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Conexión real con n8n / VISO
    try {
      const WEBHOOK_URL = import.meta.env.VITE_VISO_WEBHOOK_URL;
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          professional: professionalName,
          timestamp: new Date(),
          source: 'web_profile'
        }),
      });

      if (!response.ok) throw new Error('Error en la comunicación con VISO');

      const data = await response.json();
      
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.output || data.message || `He recibido tu mensaje. El asistente de ${professionalName} se pondrá en contacto pronto.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('VISO Error:', err);
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Lo siento, tuve un problema al conectar con mi cerebro IA. Por favor, intenta de nuevo en unos momentos.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [professionalName]);

  return { messages, sendMessage, isTyping };
}
