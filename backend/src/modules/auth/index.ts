import { Router } from 'express';
import { login, changePassword, forgotPassword, resetPassword, getMe, switchRole } from './authController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateToken, getMe);
router.post('/switch-role', authenticateToken, switchRole);

export const authModule = {
  name: 'auth',
  version: '1.0.0',
  router,
};
