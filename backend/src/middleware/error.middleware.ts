import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@hrms/shared';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal error occurred.';
  let details: Record<string, unknown> | Array<unknown> | undefined = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.errorCode;
    message = err.message;
    details = err.details;
  } else {
    logger.error('Unhandled Server Error:', {
      errorName: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  const errorResponse: ApiErrorResponse = {
    success: false,
    message,
    errorCode,
    statusCode,
    details: env.NODE_ENV === 'development' ? (details || { stack: err.stack }) : details,
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.path,
  };

  res.status(statusCode).json(errorResponse);
}
