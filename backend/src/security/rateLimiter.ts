import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const windowMs = opts.windowMs || 15 * 60 * 1000;
  const max = opts.max || 100;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const key = opts.keyGenerator ? opts.keyGenerator(req) : `${req.path}:${ip}`;

    const now = Date.now();
    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
      next();
      return;
    }

    record.count++;
    if (record.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: opts.message || 'Rate limit exceeded. Please try again later.',
          retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
        },
      });
      return;
    }

    next();
  };
}

// Pre-configured Rate Limiters for HRMS
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login/OTP attempts per window
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const documentGenRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 document generations per minute
  message: 'Document generation limit reached. Please wait a minute before generating more documents.',
});

export const exportRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 bulk exports per minute
  message: 'Export rate limit exceeded. Please try again shortly.',
});

export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 file uploads per minute
  message: 'Upload rate limit exceeded. Please wait a minute before uploading more files.',
});
