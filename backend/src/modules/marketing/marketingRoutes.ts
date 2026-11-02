import { Router } from 'express';
import {
  submitDemoRequest,
  submitContactInquiry,
  getPricingPlans,
  getMarketingDemoRequests,
  getMarketingContactInquiries,
} from './marketingController.js';
import { authenticateToken, requireRole } from '../../middleware/authMiddleware.js';

export const marketingRouter = Router();

// Public endpoints for website visitors
marketingRouter.post('/demo-request', submitDemoRequest);
marketingRouter.post('/contact', submitContactInquiry);
marketingRouter.get('/pricing', getPricingPlans);

// Admin-only review endpoints
marketingRouter.get('/demo-requests', authenticateToken, requireRole(['admin', 'SUPER_ADMIN']), getMarketingDemoRequests);
marketingRouter.get('/contacts', authenticateToken, requireRole(['admin', 'SUPER_ADMIN']), getMarketingContactInquiries);

