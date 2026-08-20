import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';
import {
  listConversations,
  getConversationMessages,
  getOrCreatePrivateConversation,
  createGroupConversation,
  sendMessage,
  uploadAttachment,
  uploadAttachmentMiddleware,
  markConversationAsRead,
  deleteMessage,
  searchChatEmployees,
  postCompanyAnnouncement,
  getTotalUnreadCount,
} from './chatController.js';

export const chatRouter = Router();

// All chat routes require authenticated token
chatRouter.use(authenticateToken);

chatRouter.get('/conversations', listConversations);
chatRouter.get('/conversations/:id/messages', getConversationMessages);
chatRouter.post('/conversations/private', getOrCreatePrivateConversation);
chatRouter.post('/conversations/group', createGroupConversation);
chatRouter.post('/conversations/:id/read', markConversationAsRead);

chatRouter.post('/messages', sendMessage);
chatRouter.post('/messages/upload', uploadAttachmentMiddleware, uploadAttachment);
chatRouter.delete('/messages/:id', deleteMessage);

chatRouter.get('/employees/search', searchChatEmployees);
chatRouter.get('/unread-count', getTotalUnreadCount);

// HR / Admin Announcement Publishing
chatRouter.post('/announcements', requireRole(['admin', 'employer']), postCompanyAnnouncement);
