import { Router } from 'express';
import { getDemoInfo, directDemoLogin, resetDemoData, verifyDemoAccess } from './demoController.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

export const demoRouter = Router();

// Demo authorization verification
demoRouter.get('/verify-access', verifyDemoAccess);

// Protected demo endpoints requiring verified demo access grant
demoRouter.get('/info', getDemoInfo);
demoRouter.post('/direct-login', directDemoLogin);

// Protected reset endpoint (can be triggered by demo users or admins)
demoRouter.post('/reset', resetDemoData);

