import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../lib/api';

/**
 * Hook de chat conectado a la API real de messages (/api/messages).
 * Carga el historial existente y envía mensajes que se persisten en la BD.
 * Fallback: si el usuario no está autenticado, muestra mensaje de login.
 */
export function useChat(professionalName, receiverId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Construir conversationId determinista (mismo algoritmo que el backend)
  const conversationId = useMemo(() => {
    if (!user?.id || !receiverId) return null;
    return [user.id, receiverId].sort().join('_');
  }, [user?.id, receiverId]);

  // Cargar historial al abrir el chat (solo si está autenticado)
  useEffect(() => {
    if (!conversationId || hasFetched) return;

    const loadHistory = async () => {
      try {
        setIsTyping(true);
        const data = await apiFetch(`/messages/${conversationId}`);
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map(m => ({
            id: m.id,
            sender: m.senderId === user.id ? 'user' : 'bot',
            text: m.content,
            timestamp: new Date(m.createdAt),
          }));
          setMessages(formatted);
        } else {
          // Saludo inicial si no hay historial
          setMessages([{
            id: 'greeting',
            sender: 'bot',
            text: `¡Hola! Soy el asistente de ${professionalName || 'este profesional'}. ¿En qué te puedo ayudar?`,
            timestamp: new Date(),
          }]);
        }
      } catch {
        setMessages([{
          id: 'greeting',
          sender: 'bot',
          text: `¡Hola! ¿En qué puedo ayudarte hoy?`,
          timestamp: new Date(),
        }]);
      } finally {
        setIsTyping(false);
        setHasFetched(true);
      }
    };

    loadHistory();
  }, [conversationId, hasFetched, professionalName, user?.id]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    // Si no está autenticado, mostrar mensaje orientador
    if (!user) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: 'Para enviar mensajes necesitas iniciar sesión. ¡Es rápido y gratis!',
        timestamp: new Date(),
        actionUrl: '/login',
      }]);
      return;
    }

    // Agregar el mensaje del usuario optimistamente
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setIsTyping(true);

    try {
      // Enviar al backend real — se persiste en la BD
      const saved = await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ receiverId, content: text }),
      });

      // Reemplazar el mensaje optimista por el persistido (con ID real)
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id
          ? { ...m, id: saved.id }
          : m
      ));
    } catch (err) {
      // Marcar mensaje como fallido
      setMessages(prev => prev.map(m =>
        m.id === optimisticMsg.id
          ? { ...m, failed: true }
          : m
      ));
    } finally {
      setIsTyping(false);
    }
  }, [user, receiverId]);

  return { messages, sendMessage, isTyping };
}

