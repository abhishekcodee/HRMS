import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import {
  getNotifications,
  markNotificationsRead,
  createNotification,
  deleteNotification,
  clearAllNotifications,
} from './notificationsController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.put('/mark-read', markNotificationsRead);
router.post('/', createNotification);
router.delete('/all', clearAllNotifications);
router.delete('/', clearAllNotifications);
router.delete('/:id', deleteNotification);

/**
 * Notifications Module Boundary
 */
export const notificationsModule = {
  name: 'notifications',
  version: '1.0.0',
  router,
};
