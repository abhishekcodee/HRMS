import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise Defense-in-Depth Security Headers Middleware.
 */
export function setSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking frame embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict unneeded browser capabilities
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Content-Security-Policy for modern UI application
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: ws: wss:;"
  );

  // HTTPS HSTS protection in production environments
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}
