import { Router } from 'express';
import { getDemoInfo, directDemoLogin, resetDemoData } from './demoController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

export const demoRouter = Router();

// Public demo endpoints
demoRouter.get('/info', getDemoInfo);
demoRouter.post('/direct-login', directDemoLogin);

// Protected reset endpoint (can be triggered by demo users or admins)
demoRouter.post('/reset', resetDemoData);

