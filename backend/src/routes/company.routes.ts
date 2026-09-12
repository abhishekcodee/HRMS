import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';
import { getPublicBranding, updateCompanyBranding } from '../modules/company/companyBrandingController.js';

export const companyRouter = Router();

// Public endpoint to resolve branding by domain, tenant ID, or company code
companyRouter.get('/branding', getPublicBranding);

// Protected endpoint to update company branding/settings
companyRouter.put('/branding', authenticateToken, tenantMiddleware, requireRole(['admin', 'super_admin']), updateCompanyBranding);
