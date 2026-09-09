import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { logSecurityEvent, extractReqSecurityContext } from './securityAuditLogger.js';

export type PermissionCode =
  | 'employee.view'
  | 'employee.create'
  | 'employee.edit'
  | 'employee.delete'
  | 'payroll.view'
  | 'payroll.process'
  | 'payroll.approve'
  | 'document.view'
  | 'document.create'
  | 'document.edit'
  | 'document.generate'
  | 'document.download'
  | 'document.approve'
  | 'document.reject'
  | 'document.send'
  | 'document.sign'
  | 'document.manage_templates'
  | 'document.delete'
  | 'security.view_audit'
  | 'security.manage_permissions'
  | 'security.manage_mfa';

// Default Role to Permission Mapping
const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  admin: [
    'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
    'payroll.view', 'payroll.process', 'payroll.approve',
    'document.view', 'document.create', 'document.edit', 'document.generate', 'document.download',
    'document.approve', 'document.reject', 'document.send', 'document.sign', 'document.manage_templates', 'document.delete',
    'security.view_audit', 'security.manage_permissions', 'security.manage_mfa'
  ],
  employer: [
    'employee.view', 'employee.create', 'employee.edit',
    'payroll.view', 'payroll.process', 'payroll.approve',
    'document.view', 'document.create', 'document.edit', 'document.generate', 'document.download',
    'document.approve', 'document.reject', 'document.send', 'document.sign', 'document.manage_templates',
    'security.view_audit'
  ],
  employee: [
    'employee.view',
    'payroll.view',
    'document.view', 'document.download', 'document.sign'
  ]
};

/**
 * Server-side Granular RBAC Permission Verification Middleware.
 */
export function requirePermission(permission: PermissionCode) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const userRole = req.user.role || 'employee';
    const allowedPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!allowedPermissions.includes(permission)) {
      const ctx = extractReqSecurityContext(req);
      await logSecurityEvent({
        ...ctx,
        action: 'PERMISSION_DENIED',
        resourceType: 'PERMISSION',
        resourceId: permission,
        status: 'DENIED',
        metadata: { userRole, requiredPermission: permission },
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access Denied: Your account role (${userRole.toUpperCase()}) lacks the '${permission}' permission.`,
        },
      });
      return;
    }

    next();
  };
}
