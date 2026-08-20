import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';

// Configure Multer for Secure File Uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${uuidv4().substring(0, 8)}_${sanitizedBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB Max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed for upload.`));
    }
  },
}).single('file');

export const uploadAttachmentMiddleware = upload;

/**
 * 1. List All Active Conversations for Authenticated User
 */
export async function listConversations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    // Fetch user conversations
    const [convRows]: any = await pool.query(
      `SELECT c.id, c.type, c.name, c.description, c.department_name as departmentName,
              c.avatar_url as avatarUrl, c.created_by as createdBy, c.created_at as createdAt,
              c.updated_at as updatedAt, p.role as participantRole, p.last_read_at as lastReadAt
       FROM chat_conversations c
       JOIN chat_participants p ON p.conversation_id = c.id
       WHERE p.user_id = ?
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    const conversations: any[] = [];

    for (const c of convRows) {
      // 1. Fetch participants for avatar/title resolution
      const [participants]: any = await pool.query(
        `SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.profile_photo as profilePhoto,
                p.role, ep.department_name as departmentName, ep.designation
         FROM chat_participants p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN employee_profiles ep ON ep.user_id = u.id
         WHERE p.conversation_id = ?`,
        [c.id]
      );

      // Resolve Title & Target User details for private 1-on-1 chats
      let targetUser = null;
      let displayTitle = c.name;
      let displayAvatar = c.avatarUrl;

      if (c.type === 'private') {
        const otherParticipant = participants.find((p: any) => p.id !== userId) || participants[0];
        if (otherParticipant) {
          targetUser = otherParticipant;
          displayTitle = otherParticipant.fullName;
          displayAvatar = otherParticipant.profilePhoto;
        }
      }

      // 2. Fetch Latest Message
      const [msgRows]: any = await pool.query(
        `SELECT m.id, m.sender_id as senderId, m.message, m.message_type as messageType,
                m.file_name as fileName, m.created_at as createdAt, m.deleted_at as deletedAt,
                u.full_name as senderName
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = ?
         ORDER BY m.created_at DESC LIMIT 1`,
        [c.id]
      );

      let lastMessage = null;
      if (msgRows.length > 0) {
        const m = msgRows[0];
        let previewText = m.message;
        if (m.deletedAt) {
          previewText = 'This message was deleted.';
        } else if (m.messageType === 'image') {
          previewText = `📷 Photo ${m.fileName ? `(${m.fileName})` : ''}`;
        } else if (m.messageType === 'file') {
          previewText = `📎 File ${m.fileName ? `(${m.fileName})` : ''}`;
        } else if (m.messageType === 'announcement') {
          previewText = `📢 ${m.message || 'Company Announcement'}`;
        } else if (!m.message || !m.message.trim()) {
          previewText = 'Sent a message';
        }

        lastMessage = {
          id: m.id,
          senderId: m.senderId,
          senderName: m.senderName,
          text: previewText,
          messageType: m.messageType,
          createdAt: m.createdAt,
        };
      }

      // 3. Count Unread Messages
      const [unreadRows]: any = await pool.query(
        `SELECT COUNT(*) as unreadCount
         FROM chat_messages m
         WHERE m.conversation_id = ?
           AND m.sender_id != ?
           AND (m.created_at > ? OR ? IS NULL)
           AND m.deleted_at IS NULL`,
        [c.id, userId, c.lastReadAt || null, c.lastReadAt || null]
      );

      conversations.push({
        id: c.id,
        type: c.type,
        name: displayTitle || 'Chat Conversation',
        description: c.description,
        departmentName: c.departmentName,
        avatarUrl: displayAvatar,
        createdBy: c.createdBy,
        updatedAt: c.updatedAt,
        targetUser,
        participants,
        lastMessage,
        unreadCount: unreadRows[0]?.unreadCount || 0,
      });
    }

    res.json({ success: true, data: conversations });
  } catch (error: any) {
    logger.error('List Conversations Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch chat conversations.' } });
  }
}

/**
 * 2. Get Messages for Conversation (Strict Server-Side Participant Guard)
 */
export async function getConversationMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id: conversationId } = req.params;
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
      return;
    }

    // MANDATORY IDOR SECURITY CHECK: Verify user is a participant of this conversation
    const [partCheck]: any = await pool.query(
      'SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );

    if (partCheck.length === 0) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access Denied: You are not authorized to view messages in this conversation.' },
      });
      return;
    }

    // Query messages with sender info and reply context
    const [msgRows]: any = await pool.query(
      `SELECT m.id, m.conversation_id as conversationId, m.sender_id as senderId,
              m.message, m.message_type as messageType, m.file_url as fileUrl,
              m.file_name as fileName, m.file_size as fileSize, m.file_type as fileType,
              m.reply_to_message_id as replyToMessageId, m.created_at as createdAt,
              m.deleted_at as deletedAt,
              u.full_name as senderName, u.email as senderEmail, u.employee_id as senderEmployeeId,
              u.profile_photo as senderAvatar
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC
       LIMIT ? OFFSET ?`,
      [conversationId, limit, offset]
    );

    // Populate reply_to details if present
    const messages: any[] = [];
    for (const m of msgRows) {
      let replyTo = null;
      if (m.replyToMessageId) {
        const [repRows]: any = await pool.query(
          `SELECT m.id, m.message, m.message_type as messageType, u.full_name as senderName
           FROM chat_messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.id = ?`,
          [m.replyToMessageId]
        );
        if (repRows.length > 0) {
          replyTo = {
            id: repRows[0].id,
            text: repRows[0].message,
            senderName: repRows[0].senderName,
          };
        }
      }

      messages.push({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderEmail: m.senderEmail,
        senderEmployeeId: m.senderEmployeeId,
        senderAvatar: m.senderAvatar,
        message: m.deletedAt ? 'This message was deleted.' : m.message,
        messageType: m.messageType,
        fileUrl: m.deletedAt ? null : m.fileUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
        fileType: m.fileType,
        replyTo,
        isDeleted: !!m.deletedAt,
        createdAt: m.createdAt,
      });
    }

    res.json({ success: true, data: messages });
  } catch (error: any) {
    logger.error('Get Messages Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch conversation messages.' } });
  }
}

/**
 * 3. Get or Create Private 1-to-1 Chat Conversation
 */
export async function getOrCreatePrivateConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.body;

    if (!userId || !targetUserId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Target User ID is required.' } });
      return;
    }

    // Verify target user exists in HRMS
    const [targetUsers]: any = await pool.query('SELECT id, full_name, email FROM users WHERE id = ?', [targetUserId]);
    if (targetUsers.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Target HRMS user not found.' } });
      return;
    }

    // Check existing private conversation between these two users
    const [existing]: any = await pool.query(
      `SELECT c.id
       FROM chat_conversations c
       JOIN chat_participants p1 ON p1.conversation_id = c.id AND p1.user_id = ?
       JOIN chat_participants p2 ON p2.conversation_id = c.id AND p2.user_id = ?
       WHERE c.type = 'private'`,
      [userId, targetUserId]
    );

    if (existing.length > 0) {
      res.json({ success: true, conversationId: existing[0].id, isNew: false });
      return;
    }

    // Create new private conversation
    const conversationId = uuidv4();
    await pool.query(
      `INSERT INTO chat_conversations (id, type, name, created_by)
       VALUES (?, 'private', ?, ?)`,
      [conversationId, targetUsers[0].full_name, userId]
    );

    // Add both participants
    await pool.query(
      `INSERT INTO chat_participants (id, conversation_id, user_id, role) VALUES
       (UUID(), ?, ?, 'member'),
       (UUID(), ?, ?, 'member')`,
      [conversationId, userId, conversationId, targetUserId]
    );

    res.status(201).json({ success: true, conversationId, isNew: true });
  } catch (error: any) {
    logger.error('Get/Create Private Chat Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to initiate private chat.' } });
  }
}

/**
 * 4. Create Group Chat Conversation
 */
export async function createGroupConversation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { name, description, memberIds } = req.body;

    if (!userId || !name || !Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Group Name and at least one member are required.' },
      });
      return;
    }

    const conversationId = uuidv4();

    await pool.query(
      `INSERT INTO chat_conversations (id, type, name, description, created_by)
       VALUES (?, 'group', ?, ?, ?)`,
      [conversationId, name.trim(), description || null, userId]
    );

    // Add creator as Admin
    await pool.query(
      `INSERT INTO chat_participants (id, conversation_id, user_id, role)
       VALUES (UUID(), ?, ?, 'admin')`,
      [conversationId, userId]
    );

    // Add members
    for (const memId of memberIds) {
      if (memId !== userId) {
        await pool.query(
          `INSERT IGNORE INTO chat_participants (id, conversation_id, user_id, role)
           VALUES (UUID(), ?, ?, 'member')`,
          [conversationId, memId]
        );
      }
    }

    res.status(201).json({ success: true, conversationId, message: `Group "${name}" created successfully.` });
  } catch (error: any) {
    logger.error('Create Group Chat Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create group conversation.' } });
  }
}

/**
 * 5. Send Message (HTTP REST Endpoint)
 */
export async function sendMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { conversationId, message, messageType = 'text', fileUrl, fileName, fileSize, fileType, replyToMessageId } = req.body;

    if (!userId || !conversationId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Conversation ID is required.' } });
      return;
    }

    // Security check: must be participant
    const [partCheck]: any = await pool.query(
      'SELECT id FROM chat_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, userId]
    );
    if (partCheck.length === 0) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not authorized for this conversation.' } });
      return;
    }

    const messageId = uuidv4();
    await pool.query(
      `INSERT INTO chat_messages (id, conversation_id, sender_id, message, message_type, file_url, file_name, file_size, file_type, reply_to_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [messageId, conversationId, userId, message || '', messageType, fileUrl || null, fileName || null, fileSize || null, fileType || null, replyToMessageId || null]
    );

    // Update conversation timestamp
    await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

    res.status(201).json({
      success: true,
      data: {
        id: messageId,
        conversationId,
        senderId: userId,
        senderName: req.user?.fullName,
        message,
        messageType,
        fileUrl,
        fileName,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('Send Message Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to send message.' } });
  }
}

/**
 * 6. Upload File / Image Attachment
 */
export async function uploadAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No file uploaded.' } });
      return;
    }

    const relativeUrl = `/uploads/chat/${req.file.filename}`;
    res.json({
      success: true,
      fileUrl: relativeUrl,
      fileName: req.file.originalname,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      fileType: req.file.mimetype,
    });
  } catch (error: any) {
    logger.error('Upload Attachment Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'File upload failed.' } });
  }
}

/**
 * 7. Mark Conversation as Read
 */
export async function markConversationAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id: conversationId } = req.params;

    if (!userId || !conversationId) return;

    await pool.query(
      `UPDATE chat_participants
       SET last_read_at = NOW()
       WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    res.json({ success: true, message: 'Conversation marked as read.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to mark as read.' } });
  }
}

/**
 * 8. Soft Delete Message
 */
export async function deleteMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id: messageId } = req.params;

    const [rows]: any = await pool.query('SELECT id, sender_id FROM chat_messages WHERE id = ?', [messageId]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found.' } });
      return;
    }

    if (rows[0].sender_id !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete your own messages.' } });
      return;
    }

    await pool.query('UPDATE chat_messages SET deleted_at = NOW() WHERE id = ?', [messageId]);
    res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete message.' } });
  }
}

/**
 * 9. Search Employees for Starting Chats
 */
export async function searchChatEmployees(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id;

    let query = `
      SELECT u.id, u.employee_id as employeeId, u.full_name as fullName, u.email, u.phone,
             u.profile_photo as profilePhoto, ep.department_name as departmentName, ep.designation
      FROM users u
      LEFT JOIN employee_profiles ep ON ep.user_id = u.id
      WHERE u.status = 'active' AND u.id != ?
    `;
    const params: any[] = [currentUserId];

    if (q) {
      const p = `%${String(q).trim()}%`;
      query += ` AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.employee_id) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?) OR LOWER(ep.department_name) LIKE LOWER(?))`;
      params.push(p, p, p, p);
    }

    query += ` ORDER BY u.full_name ASC LIMIT 20`;

    const [rows]: any = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to search employees.' } });
  }
}

/**
 * 10. Post Company Announcement (HR / Admin Role Guarded)
 */
export async function postCompanyAnnouncement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { title, message } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Announcement title and message are required.' } });
      return;
    }

    // Find HR Announcements Conversation
    const [annRows]: any = await pool.query("SELECT id FROM chat_conversations WHERE type = 'announcement' LIMIT 1");
    if (annRows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'HR Announcements channel not configured.' } });
      return;
    }

    const conversationId = annRows[0].id;
    const messageId = uuidv4();
    const formattedMsg = `📢 ${title.toUpperCase()}\n\n${message}`;

    await pool.query(
      `INSERT INTO chat_messages (id, conversation_id, sender_id, message, message_type)
       VALUES (?, ?, ?, ?, 'announcement')`,
      [messageId, conversationId, userId, formattedMsg]
    );

    await pool.query('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

    res.status(201).json({ success: true, message: 'Company announcement posted successfully!' });
  } catch (error: any) {
    logger.error('Post Announcement Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to post announcement.' } });
  }
}

/**
 * 11. Get Total Unread Badge Count Across All Conversations
 */
export async function getTotalUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, unreadCount: 0 });
      return;
    }

    const [rows]: any = await pool.query(
      `SELECT COUNT(*) as totalUnread
       FROM chat_messages m
       JOIN chat_participants p ON p.conversation_id = m.conversation_id AND p.user_id = ?
       WHERE m.sender_id != ?
         AND (m.created_at > p.last_read_at OR p.last_read_at IS NULL)
         AND m.deleted_at IS NULL`,
      [userId, userId]
    );

    res.json({ success: true, unreadCount: rows[0]?.totalUnread || 0 });
  } catch (error: any) {
    res.json({ success: true, unreadCount: 0 });
  }
}
