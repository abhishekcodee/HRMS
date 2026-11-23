import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Protection Middleware for state-changing HTTP requests.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not require CSRF token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
    next();
    return;
  }

  // Exempt public login & webhook routes if necessary
  const publicExempt = ['/api/v1/auth/login', '/iclock/', '/api/v1/zkteco/cdata', '/api/v1/zkteco/devicecmd', '/api/v1/essl/cdata', '/api/v1/essl/devicecmd'];
  if (publicExempt.some(path => req.path.toLowerCase().startsWith(path.toLowerCase()))) {
    next();
    return;
  }

  const tokenFromHeader = req.headers['x-csrf-token'] as string;
  const tokenFromCookie = req.cookies?.['XSRF-TOKEN'];

  // If token is present in header, validate matching token if cookie is set
  if (tokenFromCookie && tokenFromHeader && tokenFromHeader !== tokenFromCookie) {
    res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_CSRF_TOKEN',
        message: 'CSRF security token mismatch. Request denied.',
      },
    });
    return;
  }

  next();
}
