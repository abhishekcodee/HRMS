import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../database/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    companyId?: string | null;
    isSuperAdmin: boolean;
    employeeId: string;
    fullName: string;
    email: string;
    role: 'super_admin' | 'admin' | 'employer' | 'employee' | 'demo';
    status: 'active' | 'inactive' | 'suspended';
    mustChangePassword: boolean;
    profilePhoto?: string;
  };
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required. Please log in.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    const [rows]: any = await pool.query(
      'SELECT id, company_id, employee_id, full_name, email, role, status, profile_photo, must_change_password FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'User account not found.',
        },
      });
      return;
    }

    const user = rows[0];

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: `Your account is ${user.status}. Please contact system administrator.`,
        },
      });
      return;
    }

    const isSuper = user.role === 'super_admin';
    const headerTenantId = req.headers['x-tenant-id'] as string;

    req.user = {
      id: user.id,
      companyId: user.company_id || null,
      isSuperAdmin: isSuper,
      employeeId: user.employee_id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      profilePhoto: user.profile_photo || undefined,
      mustChangePassword: user.must_change_password === 1 || user.must_change_password === true,
    };

    req.isSuperAdmin = isSuper;
    req.tenantId = isSuper ? (headerTenantId || user.company_id || null) : (user.company_id || 'c1000000-0000-0000-0000-000000000001');

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired session token. Please log in again.',
      },
    });
  }
}

export function requireRole(allowedRoles: Array<'super_admin' | 'admin' | 'employer' | 'employee' | 'demo' | string>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    // First check if user must change password
    if (req.user.mustChangePassword) {
      const allowedPaths = ['/change-password', '/me', '/logout'];
      const currentPath = req.path.toLowerCase();
      const isAllowed = allowedPaths.some(p => currentPath.endsWith(p));

      if (!isAllowed) {
        res.status(403).json({
          success: false,
          error: {
            code: 'MUST_CHANGE_PASSWORD',
            message: 'First-time login security requirement: You must change your temporary password before accessing HRMS resources.',
          },
        });
        return;
      }
    }

    // Super admin has permission for all admin and employer routes
    const isSuper = req.user.role === 'super_admin';
    if (!isSuper && !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. ${req.user.role.toUpperCase()} role is not authorized for this resource.`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * IDOR Security Guard Middleware
 * Blocks standard Employees from querying or requesting data belonging to another user ID.
 */
export function enforceEmployeeIsolation(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    return;
  }

  // Check mandatory password change requirement
  if (req.user.mustChangePassword) {
    res.status(403).json({
      success: false,
      error: {
        code: 'MUST_CHANGE_PASSWORD',
        message: 'First-time login security requirement: You must change your temporary password before accessing HRMS resources.',
      },
    });
    return;
  }

  if (req.user.role === 'employee') {
    const requestedTarget =
      req.params.userId ||
      req.params.employeeId ||
      (req.query.user_id as string) ||
      (req.query.employee_id as string) ||
      req.body?.user_id ||
      req.body?.employee_id;

    if (requestedTarget && requestedTarget !== req.user.id && requestedTarget !== req.user.employeeId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access Denied (IDOR Guard): Standard Employees are restricted to viewing only their own records.',
        },
      });
      return;
    }
  }

  next();
}
