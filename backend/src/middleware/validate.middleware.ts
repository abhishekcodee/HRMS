import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(
          new AppError(
            'Request validation failed',
            400,
            'VALIDATION_ERROR',
            issues
          )
        );
      } else {
        next(error);
      }
    }
  };
}
