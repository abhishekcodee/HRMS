import { Router } from 'express';
import { createUser, listUsers, updateUserStatus, adminResetUserPassword, getAuditLogs } from './userController.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/audit-logs', authenticateToken, requireRole(['admin']), getAuditLogs);
router.get('/', authenticateToken, requireRole(['admin']), listUsers);
router.post('/', authenticateToken, requireRole(['admin']), createUser);
router.patch('/:userId/status', authenticateToken, requireRole(['admin']), updateUserStatus);
router.post('/:userId/reset-password', authenticateToken, requireRole(['admin', 'employer']), adminResetUserPassword);

export const usersModule = {
  name: 'users',
  version: '1.0.0',
  router,
};
