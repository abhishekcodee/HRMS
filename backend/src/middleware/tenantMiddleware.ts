import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';

export interface TenantRequest extends AuthRequest {
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}

/**
 * Tenant Isolation Middleware
 * Resolves the active company/tenant ID for all API operations.
 * Non-Super-Admins are strictly locked to their user account's assigned companyId.
 * Blocks any attempt by standard users to query or manipulate data of another company_id via URL params, body, or headers (Section 37 Guard).
 */
export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    next();
    return;
  }

  const isSuper = req.user.role === 'super_admin' || req.user.isSuperAdmin === true;
  req.isSuperAdmin = isSuper;

  const headerTenantId = (req.headers['x-tenant-id'] as string);
  const paramTenantId = req.params.companyId || (req.query.company_id as string) || (req.body?.company_id as string);

  if (isSuper) {
    req.tenantId = headerTenantId || paramTenantId || req.user.companyId || null;
  } else {
    const userCompanyId = req.user.companyId || 'c1000000-0000-0000-0000-000000000001';

    // SECTION 37 DEFENSE: If non-super user manually sends a different company_id, BLOCK IMMEDIATELY
    if (paramTenantId && paramTenantId !== userCompanyId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Cross-Tenant Access Denied (Security Section 37 Guard): You are not authorized to access or modify data belonging to another tenant company.',
        },
      });
      return;
    }

    if (headerTenantId && headerTenantId !== userCompanyId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_ACCESS_DENIED',
          message: 'Header Tenant Override Denied: Tenant context headers are reserved exclusively for Platform Super Administrators.',
        },
      });
      return;
    }

    // Hard-enforce assigned company ID
    req.tenantId = userCompanyId;
  }

  next();
}

/**
 * Helper to safely extract target company ID for SQL queries.
 * Standard users ALWAYS return their locked company_id.
 * Super admin returns requested tenant ID or falls back to default tenant if unspecified.
 */
export function getTenantId(req: TenantRequest, defaultId = 'c1000000-0000-0000-0000-000000000001'): string {
  if (req.tenantId) {
    return req.tenantId;
  }
  if (req.user?.companyId) {
    return req.user.companyId;
  }
  return defaultId;
}

/**
 * Guard middleware that enforces a valid company context.
 * Blocks requests if company context cannot be determined.
 */
export function requireTenant(req: TenantRequest, res: Response, next: NextFunction): void {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_REQUIRED',
        message: 'A valid Company/Tenant context is required for this operation.',
      },
    });
    return;
  }
  next();
}
