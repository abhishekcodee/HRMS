import { Router, Response } from 'express';
import { pool } from '../../database/index.js';
import { authenticateToken, AuthRequest } from '../../middleware/authMiddleware.js';
import { enforceTenantIsolation } from '../../security/tenantIsolation.js';
import { requirePermission } from '../../security/rbacPermissions.js';
import { setupMfa, verifyAndEnableMfa } from '../../security/mfaService.js';
import { logger } from '../../utils/logger.js';

const router = Router();
router.use(authenticateToken);
router.use(enforceTenantIsolation as any);

/**
 * GET /api/v1/security/audit-logs — Centralized Security & Audit Event Log Viewer
 */
router.get('/audit-logs', requirePermission('security.view_audit'), async (req: AuthRequest, res: Response) => {
  try {
    const { action, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT id, company_id as companyId, actor_user_id as actorUserId,
             actor_user_email as actorUserEmail, actor_role as actorRole,
             action, resource_type as resourceType, resource_id as resourceId,
             status, ip_address as ipAddress, user_agent as userAgent,
             metadata_json as metadataJson, created_at as createdAt
      FROM security_audit_logs
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (action) {
      conditions.push(`action LIKE ?`);
      params.push(`%${action}%`);
    }

    if (status) {
      conditions.push(`status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows]: any = await pool.query(query, params);
    
    // Also fetch count
    const [countRows]: any = await pool.query(`SELECT COUNT(*) as total FROM security_audit_logs`);

    res.json({ success: true, data: rows, total: countRows[0]?.total || rows.length });
  } catch (error: any) {
    logger.error('Get Security Audit Logs Error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch security audit logs.' } });
  }
});

/**
 * MFA Setup & Verification Endpoints
 */
router.post('/mfa/setup', setupMfa);
router.post('/mfa/enable', verifyAndEnableMfa);

export const securityModule = {
  name: 'security',
  version: '1.0.0',
  router,
};

export default router;
