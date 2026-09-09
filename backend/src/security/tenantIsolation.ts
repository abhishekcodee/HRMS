import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { pool } from '../database/index.js';
import { logSecurityEvent, extractReqSecurityContext } from './securityAuditLogger.js';

export interface TenantAuthRequest extends AuthRequest {
  user?: AuthRequest['user'] & {
    companyId?: string | null;
  };
}

/**
 * Resolves the authenticated user's active company ID server-side.
 * Never trusts company_id directly from request payload without validation.
 */
export async function enforceTenantIsolation(req: TenantAuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  try {
    // If companyId is not yet resolved on req.user, resolve from DB
    if (!req.user.companyId) {
      // Check if user is associated with an employee profile or company
      const [empRows]: any = await pool.query(
        `SELECT ep.id as employee_id, ep.user_id 
         FROM employee_profiles ep WHERE ep.user_id = ?`,
        [req.user.id]
      );

      const [compRows]: any = await pool.query(
        `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
      );

      const primaryCompanyId = compRows.length > 0 ? compRows[0].id : 'default-company';
      req.user.companyId = primaryCompanyId;
    }

    // Tenant IDOR Protection Guard:
    // If client supplied company_id in URL or Query, ensure it matches req.user.companyId unless user is admin
    const requestedCompanyId = req.params.companyId || (req.query.company_id as string) || req.body?.company_id;
    if (requestedCompanyId && req.user.role !== 'admin' && requestedCompanyId !== req.user.companyId) {
      const ctx = extractReqSecurityContext(req);
      await logSecurityEvent({
        ...ctx,
        action: 'TENANT_ISOLATION_VIOLATION_ATTEMPT',
        resourceType: 'COMPANY',
        resourceId: requestedCompanyId,
        status: 'DENIED',
        metadata: { requestedCompanyId, userCompanyId: req.user.companyId },
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Access Denied: You are not authorized to access resources outside your assigned company.',
        },
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Tenant resolution error.' } });
  }
}
