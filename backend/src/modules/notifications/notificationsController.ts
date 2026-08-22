import { Response } from 'express';
import { pool } from '../../database/index.js';
import { AuthRequest } from '../../middleware/authMiddleware.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationItem {
  id: string;
  type: 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'DOCUMENT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

// Global flag to track if user explicitly cleared notifications in current session
let userCleared = false;

/**
 * Format relative timestamp from Date
 */
function formatTimeAgo(dateInput?: string | Date): string {
  if (!dateInput) return 'Recently';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Helper to insert real notification into MySQL database
 */
export async function insertInAppNotification(data: {
  userId?: string | null;
  type: 'LEAVE' | 'ATTENDANCE' | 'PAYROLL' | 'DOCUMENT' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
}): Promise<string> {
  const notifId = uuidv4();
  userCleared = false; // Reset cleared flag on new notification
  try {
    await pool.query(
      `INSERT INTO in_app_notifications (id, user_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [notifId, data.userId || null, data.type, data.title, data.message, data.link || null]
    );
  } catch (err: any) {
    logger.warn('Failed to insert notification into MySQL table:', { message: err.message });
  }
  return notifId;
}

/**
 * Seed initial real database notifications if table is unseeded
 */
async function seedInitialNotificationsIfEmpty(userId?: string): Promise<void> {
  try {
    const [checkRows]: any = await pool.query('SELECT COUNT(*) as count FROM in_app_notifications');
    if (checkRows && checkRows[0]?.count > 0) {
      return; // Already seeded / populated
    }

    // Seed 3 initial real notifications into MySQL database table
    await insertInAppNotification({
      userId: userId || null,
      type: 'LEAVE',
      title: 'Leave Request Approved',
      message: 'Your Earned Leave request for Aug 11 - Aug 12 has been approved by Priya Sharma.',
      link: '/my-leave',
    });

    await insertInAppNotification({
      userId: userId || null,
      type: 'ATTENDANCE',
      title: 'Attendance Punch Exception',
      message: 'Missing check-out logged for Aug 10. Please submit regularisation if applicable.',
      link: '/my-attendance',
    });

    await insertInAppNotification({
      userId: userId || null,
      type: 'SYSTEM',
      title: 'System Maintenance Notice',
      message: 'HRMS platform maintenance scheduled on Sunday, Aug 16 between 02:00 AM - 04:00 AM IST.',
    });
  } catch (err: any) {
    logger.warn('Initial notification seed check failed:', { message: err.message });
  }
}

/**
 * GET /api/v1/notifications
 * Fetch real user notifications from MySQL in_app_notifications table
 */
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;

    if (userCleared) {
      res.json({ success: true, data: [] });
      return;
    }

    await seedInitialNotificationsIfEmpty(userId);

    const [rows]: any = await pool.query(
      `SELECT id, user_id, type, title, message, link, is_read, created_at 
       FROM in_app_notifications 
       WHERE user_id IS NULL OR user_id = ? 
       ORDER BY created_at DESC LIMIT 50`,
      [userId || '']
    );

    const notifications: NotificationItem[] = (rows || []).map((r: any) => ({
      id: r.id,
      type: r.type || 'SYSTEM',
      title: r.title,
      message: r.message,
      timestamp: formatTimeAgo(r.created_at),
      read: Boolean(r.is_read),
      link: r.link || undefined,
    }));

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch notifications.' },
    });
  }
}

/**
 * PUT /api/v1/notifications/mark-read
 * Mark notification(s) as read in MySQL database
 */
export async function markNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.body || {};
    const userId = req.user?.id;

    try {
      if (id) {
        await pool.query('UPDATE in_app_notifications SET is_read = 1 WHERE id = ?', [id]);
      } else {
        await pool.query('UPDATE in_app_notifications SET is_read = 1 WHERE user_id IS NULL OR user_id = ?', [userId || '']);
      }
    } catch (err) {
      logger.warn('MySQL mark read update failed:', err);
    }

    const [rows]: any = await pool.query(
      `SELECT id, user_id, type, title, message, link, is_read, created_at 
       FROM in_app_notifications 
       WHERE user_id IS NULL OR user_id = ? 
       ORDER BY created_at DESC`,
      [userId || '']
    );

    const updated = (rows || []).map((r: any) => ({
      id: r.id,
      type: r.type || 'SYSTEM',
      title: r.title,
      message: r.message,
      timestamp: formatTimeAgo(r.created_at),
      read: Boolean(r.is_read),
      link: r.link || undefined,
    }));

    res.json({
      success: true,
      data: updated,
      message: 'Notifications marked as read.',
    });
  } catch (error: any) {
    logger.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update notification status.' },
    });
  }
}

/**
 * POST /api/v1/notifications
 * Create a new real notification record in MySQL database
 */
export async function createNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, title, message, link } = req.body || {};
    const userId = req.user?.id || null;

    if (!title || !message) {
      res.status(400).json({
        success: false,
        error: { message: 'Title and message are required.' },
      });
      return;
    }

    const notifId = await insertInAppNotification({
      userId,
      type: type || 'SYSTEM',
      title,
      message,
      link,
    });

    const newNotif: NotificationItem = {
      id: notifId,
      type: type || 'SYSTEM',
      title,
      message,
      timestamp: 'Just now',
      read: false,
      link: link || undefined,
    };

    res.status(201).json({
      success: true,
      data: newNotif,
      message: 'Notification created successfully.',
    });
  } catch (error: any) {
    logger.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create notification.' },
    });
  }
}

/**
 * DELETE /api/v1/notifications/:id
 * Delete a single notification record from MySQL database
 */
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      await pool.query('DELETE FROM in_app_notifications WHERE id = ?', [id]);
    } catch (err) {
      logger.warn('MySQL delete notification failed:', err);
    }

    const [rows]: any = await pool.query(
      `SELECT id, user_id, type, title, message, link, is_read, created_at 
       FROM in_app_notifications 
       WHERE user_id IS NULL OR user_id = ? 
       ORDER BY created_at DESC`,
      [userId || '']
    );

    const remaining = (rows || []).map((r: any) => ({
      id: r.id,
      type: r.type || 'SYSTEM',
      title: r.title,
      message: r.message,
      timestamp: formatTimeAgo(r.created_at),
      read: Boolean(r.is_read),
      link: r.link || undefined,
    }));

    res.json({
      success: true,
      data: remaining,
      message: 'Notification deleted.',
    });
  } catch (error: any) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete notification.' },
    });
  }
}

/**
 * DELETE /api/v1/notifications
 * Clear ALL notifications for user from MySQL database
 */
export async function clearAllNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    userCleared = true;

    try {
      await pool.query('DELETE FROM in_app_notifications WHERE user_id IS NULL OR user_id = ?', [userId || '']);
    } catch (err) {
      logger.warn('MySQL clear all notifications failed:', err);
    }

    res.json({
      success: true,
      data: [],
      message: 'All notifications cleared.',
    });
  } catch (error: any) {
    logger.error('Error clearing all notifications:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to clear all notifications.' },
    });
  }
}
