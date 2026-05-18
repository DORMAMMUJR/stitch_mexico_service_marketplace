import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';
import { canEncryptMessages, decryptMessage, encryptMessage, type EncryptedMessagePayload } from '../lib/messageCrypto';
import { logSecurityAuditEvent } from '../lib/securityAudit';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * Genera un conversationId determinista ordenando ambos IDs.
 * Garantiza que chat(A,B) === chat(B,A) sin importar quién inicia.
 */
const CONVERSATION_SEPARATOR = '_';
const MEDICAL_CONVERSATION_SUFFIX = ':medical';

function buildConversationId(id1: string, id2: string, sensitive: boolean): string {
  const baseId = [id1, id2].sort().join(CONVERSATION_SEPARATOR);
  return sensitive ? `${baseId}${MEDICAL_CONVERSATION_SUFFIX}` : baseId;
}

function getConversationParticipants(conversationId: string): string[] {
  return conversationId.replace(MEDICAL_CONVERSATION_SUFFIX, '').split(CONVERSATION_SEPARATOR);
}

function isClinicalContent(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const markers = ['diagnostico', 'sintoma', 'laboratorio', 'historial clinico', 'radiografia', 'medicamento', 'receta', 'dolor', 'presion arterial'];
  return markers.some((marker) => normalized.includes(marker));
}

function decryptMessageContent(message: any): string {
  if (!message?.contentIsEncrypted || !message?.encryptedPayload) return String(message?.content || '');
  try {
    const payload = JSON.parse(String(message.encryptedPayload)) as EncryptedMessagePayload;
    return decryptMessage(payload) || '[mensaje cifrado no disponible]';
  } catch {
    return '[mensaje cifrado no disponible]';
  }
}

// ─── GET /api/messages/conversations ────────────────────────────────────────
// Devuelve la lista de chats activos con el último mensaje y datos del interlocutor.
router.get('/conversations', async (req, res, next) => {
  const me = (req as any).user;
  const myId = me.userId;

  try {
    // Obtener todos los mensajes donde el usuario participa
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: myId }, { receiverId: myId }],
        NOT: { deletedFor: { has: myId } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Agrupar por conversationId manteniendo solo el más reciente
    const seen = new Set<string>();
    const conversationsMap = new Map<string, any>();

    for (const msg of allMessages) {
      if (!seen.has(msg.conversationId)) {
        seen.add(msg.conversationId);

        // El "otro" participante de la conversación
        const other = msg.senderId === myId ? msg.receiver : msg.sender;

        conversationsMap.set(msg.conversationId, {
          conversationId: msg.conversationId,
          channel: msg.conversationId.endsWith(MEDICAL_CONVERSATION_SUFFIX) ? 'MEDICAL_SENSITIVE' : 'GENERAL',
          contact: other,
          lastMessage: {
            content: decryptMessageContent(msg),
            createdAt: msg.createdAt,
            isMine: msg.senderId === myId,
            sensitivity: msg.contentSensitivity,
          },
          unreadCount: 0, // default, se actualizará abajo
        });
      }
    }

    // Contar todos los no leídos donde soy receptor, agrupados por conversationId
    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: { 
        receiverId: myId, 
        read: false,
        conversationId: { in: Array.from(seen) },
        NOT: { deletedFor: { has: myId } },
      },
      _count: {
        id: true
      }
    });

    // Asignar los conteos reales a las conversaciones
    for (const count of unreadCounts) {
      if (conversationsMap.has(count.conversationId)) {
        conversationsMap.get(count.conversationId).unreadCount = count._count.id;
      }
    }

    await logSecurityAuditEvent({
      action: 'messages.conversations_viewed',
      actorUserId: myId,
      metadata: { totalConversations: conversationsMap.size },
    });

    res.json(Array.from(conversationsMap.values()));
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/messages/:conversationId ──────────────────────────────────────
// Devuelve el historial de mensajes de una conversación.
// También marca como leídos todos los mensajes recibidos.
router.get('/:conversationId', async (req, res, next) => {
  const me = (req as any).user;
  const myId = me.userId;
  const { conversationId } = req.params;

  // Seguridad: verificar que el usuario es parte de esta conversación
  // Usamos split en lugar de includes() para evitar falsos positivos con IDs que son substrings
  const participants = getConversationParticipants(conversationId);
  if (!participants.includes(myId)) {
    return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        NOT: { deletedFor: { has: myId } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Marcar como leídos los mensajes que el usuario recibió
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: myId,
        read: false,
        NOT: { deletedFor: { has: myId } },
      },
      data: { read: true },
    });

    const sanitized = messages.map((message) => ({
      ...message,
      content: decryptMessageContent(message),
    }));

    await logSecurityAuditEvent({
      action: 'messages.thread_viewed',
      actorUserId: myId,
      conversationId,
      metadata: { messageCount: sanitized.length },
    });

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/messages ─────────────────────────────────────────────────────
// Crea un nuevo mensaje en una conversación.
router.post('/', async (req, res, next) => {
  const me = (req as any).user;
  const myId = me.userId;
  const { receiverId, content } = req.body;

  if (!receiverId || !content?.trim()) {
    return res.status(400).json({ error: 'receiverId y content son requeridos' });
  }

  if (receiverId === myId) {
    return res.status(400).json({ error: 'No puedes enviarte mensajes a ti mismo' });
  }

  try {
    // Verificar que el receptor existe
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return res.status(404).json({ error: 'Usuario receptor no encontrado' });
    }

    const trimmedContent = content.trim();
    const clinical = isClinicalContent(trimmedContent);
    const sender = await prisma.user.findUnique({
      where: { id: myId },
      select: { sensitiveHealthDataConsentedAt: true },
    });

    if (clinical && !sender?.sensitiveHealthDataConsentedAt) {
      return res.status(403).json({ error: 'Requiere consentimiento de tratamiento de datos sensibles de salud' });
    }

    const conversationId = buildConversationId(myId, receiverId, clinical);
    const encryptionEnabled = clinical && canEncryptMessages();
    const encryptedPayload = encryptionEnabled ? encryptMessage(trimmedContent) : null;

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: myId,
        receiverId,
        content: encryptionEnabled ? '[ENCRYPTED]' : trimmedContent,
        encryptedPayload: encryptedPayload ? JSON.stringify(encryptedPayload) : null,
        contentIsEncrypted: Boolean(encryptedPayload),
        contentKeyVersion: encryptedPayload?.keyVersion || null,
        contentSensitivity: clinical ? 'CLINICAL' : 'NORMAL',
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await logSecurityAuditEvent({
      action: 'messages.sent',
      actorUserId: myId,
      targetUserId: receiverId,
      conversationId,
      metadata: { encrypted: Boolean(encryptedPayload), sensitivity: clinical ? 'CLINICAL' : 'NORMAL' },
    });

    res.status(201).json({
      ...message,
      content: trimmedContent,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/messages/:conversationId
// Elimina el historial de la conversación para el usuario participante.
router.delete('/:conversationId', async (req, res, next) => {
  const me = (req as any).user;
  const myId = me.userId;
  const { conversationId } = req.params;

  const participants = getConversationParticipants(conversationId);
  if (!participants.includes(myId)) {
    return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        NOT: { deletedFor: { has: myId } },
      },
      select: { id: true, deletedFor: true },
    });

    if (messages.length === 0) {
      return res.json({ message: 'La conversación ya estaba oculta para este usuario' });
    }

    await prisma.$transaction(
      messages.map((message) =>
        prisma.message.update({
          where: { id: message.id },
          data: { deletedFor: { set: [...message.deletedFor, myId] } },
        })
      )
    );

    res.json({ message: 'Conversación ocultada para este usuario' });
  } catch (err) {
    next(err);
  }
});

export { router as messagesRouter };
