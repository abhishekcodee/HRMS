import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { pool } from '../../database/index.js';
import { logger } from '../../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

// Track online user socket instances
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function setupChatSockets(io: Server): void {
  // Middleware to authenticate socket connections via JWT
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      const [rows]: any = await pool.query('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [decoded.id]);

      if (rows.length === 0 || rows[0].status !== 'active') {
        return next(new Error('User account not active or invalid'));
      }

      socket.user = {
        id: rows[0].id,
        fullName: rows[0].full_name,
        email: rows[0].email,
        role: rows[0].role,
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.user?.id;
    if (!userId) return;

    logger.info(`🔌 Socket connected: ${socket.user?.fullName} (${socket.id})`);

    // Track online user sockets
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)?.add(socket.id);

    // Join user's personal room & global status room
    socket.join(`user_${userId}`);
    socket.join('global_status');

    // Broadcast Online status to all connected clients
    io.to('global_status').emit('user_online', { userId });

    // Join all conversation rooms for this user
    try {
      const [convs]: any = await pool.query(
        'SELECT conversation_id FROM chat_participants WHERE user_id = ?',
        [userId]
      );
      for (const c of convs) {
        socket.join(`conv_${c.conversation_id}`);
      }
    } catch (err) {
      logger.error('Error joining conversation rooms:', err);
    }

    // 1. Client requests list of online users
    socket.on('get_online_users', () => {
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('online_users_list', onlineUserIds);
    });

    // 2. Client sends a message in real-time
    socket.on('send_message', async (data: {
      conversationId: string;
      message: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: string;
      fileType?: string;
      replyToMessageId?: string;
    }, ackCallback?: (res: any) => void) => {
      try {
        const { conversationId, message, messageType = 'text', fileUrl, fileName, fileSize, fileType, replyToMessageId } = data;

        // Verify participant
        const [partCheck]: any = await pool.query(
          'SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?',
          [conversationId, userId]
        );
        if (partCheck.length === 0) {
          if (ackCallback) ackCallback({ success: false, error: 'Not authorized' });
          return;
        }

        const messageId = uuidv4();
        await pool.query(
          `INSERT INTO chat_messages (id, conversation_id, sender_id, message, message_type, file_url, file_name, file_size, file_type, reply_to_message_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [messageId, conversationId, userId, message || '', messageType, fileUrl || null, fileName || null, fileSize || null, fileType || null, replyToMessageId || null]
        );

        await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

        // Get sender profile for payload
        const [userRows]: any = await pool.query('SELECT profile_photo FROM users WHERE id = ?', [userId]);

        let replyTo = null;
        if (replyToMessageId) {
          const [repRows]: any = await pool.query(
            `SELECT m.id, m.message, u.full_name as senderName
             FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?`,
            [replyToMessageId]
          );
          if (repRows.length > 0) {
            replyTo = { id: repRows[0].id, text: repRows[0].message, senderName: repRows[0].senderName };
          }
        }

        const payload = {
          id: messageId,
          conversationId,
          senderId: userId,
          senderName: socket.user?.fullName,
          senderAvatar: userRows[0]?.profile_photo || null,
          message,
          messageType,
          fileUrl,
          fileName,
          fileSize,
          fileType,
          replyTo,
          createdAt: new Date().toISOString(),
        };

        // Broadcast to conversation room
        io.to(`conv_${conversationId}`).emit('new_message', payload);

        // Notify participants who haven't joined room
        const [participants]: any = await pool.query('SELECT user_id FROM chat_participants WHERE conversation_id = ?', [conversationId]);
        for (const p of participants) {
          io.to(`user_${p.user_id}`).emit('unread_update', { conversationId });
        }

        if (ackCallback) ackCallback({ success: true, message: payload });
      } catch (err) {
        logger.error('Socket send_message error:', err);
        if (ackCallback) ackCallback({ success: false, error: 'Failed to send message' });
      }
    });

    // 3. Typing Indicators
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName: socket.user?.fullName,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId,
      });
    });

    // 4. Mark Conversation Read
    socket.on('mark_read', async ({ conversationId }) => {
      try {
        await pool.query(
          'UPDATE chat_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
          [conversationId, userId]
        );
        socket.to(`conv_${conversationId}`).emit('messages_read_by_user', { conversationId, userId });
      } catch (err) {
        logger.error('Socket mark_read error:', err);
      }
    });

    // 5. Handle Disconnect
    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.user?.fullName} (${socket.id})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.to('global_status').emit('user_offline', { userId });
        }
      }
    });
  });
}
