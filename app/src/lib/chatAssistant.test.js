import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectHandoffIntent,
  getGuidedFallbackReply,
  getSensitiveHealthChatNotice,
  shouldSendHandoffSummary,
} from './chatAssistant.js';

test('detectHandoffIntent identifies explicit contact intent in Spanish keywords', () => {
  const result = detectHandoffIntent('Quiero que me contacten por WhatsApp para seguimiento');
  assert.equal(result, true);
});

test('getGuidedFallbackReply always guides user to profile calendar action', () => {
  const reply = getGuidedFallbackReply('Pamela');
  assert.match(reply, /calendario|agenda|horario/i);
});

test('shouldSendHandoffSummary prevents duplicates when summarySent is true', () => {
  const shouldSend = shouldSendHandoffSummary({
    summarySent: true,
    nextAction: 'HANDOFF_HUMAN',
    userMessage: 'quiero hablar con pamela',
  });

  assert.equal(shouldSend, false);
});

test('getSensitiveHealthChatNotice separates medical data from general chat', () => {
  const notice = getSensitiveHealthChatNotice();

  assert.match(notice, /datos sensibles de salud/i);
  assert.match(notice, /no es expediente clinico/i);
});
