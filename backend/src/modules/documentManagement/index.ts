import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { enforceTenantIsolation } from '../../security/tenantIsolation.js';
import { requirePermission } from '../../security/rbacPermissions.js';
import { documentGenRateLimiter, fileUploadRateLimiter } from '../../security/rateLimiter.js';
import {
  getDocumentCategories,
  createDocumentCategory,
  getDocumentTypes,
  createDocumentType,
} from './documentTypeController.js';
import {
  getDocumentTemplates,
  getActiveTemplateForType,
  getTemplateById,
  saveDocumentTemplate,
} from './templateBuilderController.js';
import {
  generateDocument,
  approveDocument,
} from './documentWorkflowController.js';
import {
  downloadDocumentSecurely,
  getEmployeeLocker,
} from './secureStorageController.js';

const router = Router();
router.use(authenticateToken);
router.use(enforceTenantIsolation as any);

// Categories & Types
router.get('/categories', getDocumentCategories);
router.post('/categories', requirePermission('document.manage_templates'), createDocumentCategory);
router.get('/types', getDocumentTypes);
router.post('/types', requirePermission('document.manage_templates'), createDocumentType);

// Templates & Versions
router.get('/templates', getDocumentTemplates);
router.get('/templates/active', getActiveTemplateForType);
router.get('/templates/:id', getTemplateById);
router.post('/templates', requirePermission('document.manage_templates'), saveDocumentTemplate);

// Document Generation & Workflow
router.post('/generate', documentGenRateLimiter, requirePermission('document.generate'), generateDocument);
router.post('/:id/approve', requirePermission('document.approve'), approveDocument);

// Employee Locker & Downloads
router.get('/locker', getEmployeeLocker);
router.get('/my-locker', getEmployeeLocker);
router.get('/:id/download', downloadDocumentSecurely);

export const documentManagementModule = {
  name: 'documentManagement',
  version: '2.0.0',
  router,
};

export default router;
