import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { getSettings, updateSettings } from './settingsController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSettings);
router.put('/', updateSettings);

export default router;
