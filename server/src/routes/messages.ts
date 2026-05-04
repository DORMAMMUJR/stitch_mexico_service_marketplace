import { Router } from 'express';
import { prisma } from '../lib/db';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * Genera un conversationId determinista ordenando ambos IDs.
 * Garantiza que chat(A,B) === chat(B,A) sin importar quién inicia.
 */
const CONVERSATION_SEPARATOR = '::';

function buildConversationId(id1: string, id2: string): string {
  return [id1, id2].sort().join(CONVERSATION_SEPARATOR);
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
          contact: other,
          lastMessage: {
            content: msg.content,
            createdAt: msg.createdAt,
            isMine: msg.senderId === myId,
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
        conversationId: { in: Array.from(seen) }
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
  const participants = conversationId.split(CONVERSATION_SEPARATOR);
  if (!participants.includes(myId)) {
    return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Marcar como leídos los mensajes que el usuario recibió
    await prisma.message.updateMany({
      where: { conversationId, receiverId: myId, read: false },
      data: { read: true },
    });

    res.json(messages);
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

    const conversationId = buildConversationId(myId, receiverId);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: myId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

export { router as messagesRouter };
