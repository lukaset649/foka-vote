import { ErrorCode } from './error-code.js';

export interface AppErrorOptions {
  details?: unknown;
  isOperational?: boolean;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;
  readonly isOperational: boolean;

  constructor(code: ErrorCode, statusCode: number, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;

    Error.captureStackTrace(this, AppError);
  }
}

function createError(
  code: ErrorCode,
  statusCode: number,
  message: string,
  options?: AppErrorOptions,
): AppError {
  return new AppError(code, statusCode, message, options);
}

export function badRequest(message = 'Invalid input data', options?: AppErrorOptions): AppError {
  return createError(ErrorCode.VALIDATION_FAILED, 400, message, options);
}

export function unauthorized(
  message = 'Authentication required',
  options?: AppErrorOptions,
): AppError {
  return createError(ErrorCode.UNAUTHORIZED, 401, message, options);
}

export function forbidden(message = 'Access denied', options?: AppErrorOptions): AppError {
  return createError(ErrorCode.FORBIDDEN, 403, message, options);
}

export function notFound(message = 'Resource not found', options?: AppErrorOptions): AppError {
  return createError(ErrorCode.NOT_FOUND, 404, message, options);
}

export function conflict(message = 'Conflict', options?: AppErrorOptions): AppError {
  return createError(ErrorCode.CONFLICT, 409, message, options);
}

export function internal(
  message = 'Internal server error',
  options: AppErrorOptions = {},
): AppError {
  return createError(ErrorCode.INTERNAL_ERROR, 500, message, {
    ...options,
    isOperational: options.isOperational ?? false,
  });
}
