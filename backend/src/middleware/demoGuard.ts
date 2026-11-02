import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenantMiddleware.js';

/**
 * Demo Guard Middleware
 * Restricts mutating or sensitive administrative operations for visitors logged into the public demo account.
 * Allows realistic exploratory operations (dashboard, employees, attendance punches, leave requests)
 * while guarding production integrity and preventing tampering or lockout.
 */
export function demoGuard(req: TenantRequest, res: Response, next: NextFunction): void {
  // Only apply to users with the 'demo' role
  if (!req.user || req.user.role !== 'demo') {
    return next();
  }

  const url = (req.baseUrl + req.path).toLowerCase();
  const method = req.method.toUpperCase();

  // 1. Strictly block Super Admin routes
  if (url.includes('/super-admin')) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Platform Super Administration is restricted in Demo Mode. Subscribe to unlock full enterprise access.',
      },
    });
    return;
  }

  // 2. Block modifying company settings, branding, or statutory configurations
  if (
    (url.includes('/settings') ||
      url.includes('/companies') ||
      url.includes('/company') ||
      url.includes('/statutory-settings') ||
      url.includes('/letter-numbering') ||
      url.includes('/document-management/letterhead')) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  ) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Modifying core company settings, branding, or statutory rules is restricted in Demo Mode.',
      },
    });
    return;
  }

  // 3. Block bank payments, payouts, and real bank account transfers
  if (
    url.includes('/bank-transfer') ||
    url.includes('/bank-payment') ||
    url.includes('/payout') ||
    url.includes('/disburse') ||
    (url.includes('/payroll') && url.includes('/process') && method === 'POST')
  ) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Real banking transfers and live payment processing are restricted in Demo Mode.',
      },
    });
    return;
  }

  // 4. Block changing credentials / password to prevent demo account lockout
  if (url.includes('/change-password') || url.includes('/reset-password')) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Password changes for the public demo account are disabled.',
      },
    });
    return;
  }

  // 5. Block modifying security or audit logs
  if (url.includes('/security') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Security policy reconfiguration is restricted in Demo Mode.',
      },
    });
    return;
  }

  // 6. Block permanent record deletions in demo mode
  if (method === 'DELETE') {
    res.status(403).json({
      success: false,
      error: {
        code: 'DEMO_RESTRICTION',
        message: 'Permanent record deletion is disabled in Demo Mode. Use "Reset Demo Data" to restore original state.',
      },
    });
    return;
  }

  // Safe exploratory actions pass through
  next();
}

