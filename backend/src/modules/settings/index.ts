import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getSettings, updateSettings } from './settingsController.js';
import { requireHr } from '../../security/accessControl.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSettings);
router.put('/', requireHr, updateSettings);

export default router;
