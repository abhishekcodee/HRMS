export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown> | Array<unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown> | Array<unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
