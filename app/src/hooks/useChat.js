import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { apiFetch } from '../lib/api';
import { getGreeting } from '../lib/professionalKnowledge';
import {
  buildHandoffSummary,
  getGuidedFallbackReply,
  shouldSendHandoffSummary,
} from '../lib/chatAssistant';

/**
 * Hook de chat asistido por IA para perfil profesional.
 * No persiste cada mensaje en /messages; solo envía resumen al detectar handoff humano.
 */
export function useChat(professionalName, receiverId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => [
    { id: 'greeting', sender: 'bot', text: getGreeting(professionalName), timestamp: new Date() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const summarySessionKey = useMemo(() => {
    return `chat_summary_sent:${user?.id || 'guest'}:${receiverId || 'unknown'}`;
  }, [receiverId, user?.id]);
  const [summarySent, setSummarySent] = useState(() => sessionStorage.getItem(summarySessionKey) === '1');

  useEffect(() => {
    setMessages([{ id: 'greeting', sender: 'bot', text: getGreeting(professionalName), timestamp: new Date() }]);
  }, [professionalName, receiverId]);

  useEffect(() => {
    setSummarySent(sessionStorage.getItem(summarySessionKey) === '1');
  }, [summarySessionKey]);

  const markSummarySent = useCallback(() => {
    sessionStorage.setItem(summarySessionKey, '1');
    setSummarySent(true);
  }, [summarySessionKey]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;
      const trimmed = text.trim();

      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: new Date(),
      };
      const snapshotMessages = [...messages, optimisticMsg];
      setMessages(snapshotMessages);

      setIsTyping(true);
      let botText = getGuidedFallbackReply(professionalName);
      let nextAction = 'BOOK_ON_CALENDAR';

      try {
        const historyPayload = snapshotMessages.slice(-8).map((m) => ({
          sender: m.sender,
          text: m.text,
        }));
        const aiResponse = await apiFetch('/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: trimmed,
            professional: professionalName,
            professionalId: receiverId,
            history: historyPayload,
          }),
        });

        if (typeof aiResponse?.output === 'string' && aiResponse.output.trim()) {
          botText = aiResponse.output.trim();
        }
        if (typeof aiResponse?.nextAction === 'string') {
          nextAction = aiResponse.nextAction;
        }
      } catch {
        botText = getGuidedFallbackReply(professionalName);
        nextAction = 'BOOK_ON_CALENDAR';
      }

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

      const canSendSummary = Boolean(user?.id && receiverId && user.id !== receiverId);
      const shouldSendSummary = canSendSummary && shouldSendHandoffSummary({
        summarySent,
        nextAction,
        userMessage: trimmed,
      });

      if (shouldSendSummary) {
        try {
          const summaryText = buildHandoffSummary({
            professionalName,
            messages: snapshotMessages,
            lastUserMessage: trimmed,
          });
          await apiFetch('/messages', {
            method: 'POST',
            body: JSON.stringify({ receiverId, content: summaryText }),
          });
          markSummarySent();
        } catch {
          // Si falla el resumen, no se marca como enviado para reintento en siguiente intención.
        }
      }
    },
    [user, receiverId, professionalName, messages, summarySent, markSummarySent]
  );

  return { messages, sendMessage, isTyping };
}
