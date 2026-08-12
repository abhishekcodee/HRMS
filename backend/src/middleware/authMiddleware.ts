import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../database/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    employeeId: string;
    fullName: string;
    email: string;
    role: 'admin' | 'employer' | 'employee';
    status: 'active' | 'inactive' | 'suspended';
    mustChangePassword: boolean;
  };
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

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
      'SELECT id, employee_id, full_name, email, role, status, must_change_password FROM users WHERE id = ?',
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

    req.user = {
      id: user.id,
      employeeId: user.employee_id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      mustChangePassword: user.must_change_password === 1 || user.must_change_password === true,
    };

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

export function requireRole(allowedRoles: Array<'admin' | 'employer' | 'employee'>) {
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

    if (!allowedRoles.includes(req.user.role)) {
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
