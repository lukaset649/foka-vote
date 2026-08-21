import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { ErrorCode } from '../errors/error-code.js';
import { logger } from '../lib/logger.js';

// This response shape moves to packages/shared as a shared type once that package exists (stage 6).
interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details: unknown;
    requestId: string;
  };
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  const appError = error instanceof AppError ? error : null;
  const statusCode = appError?.statusCode ?? 500;
  const code = appError?.code ?? ErrorCode.INTERNAL_ERROR;
  const clientMessage = appError ? appError.message : 'Internal server error';
  const details = appError ? (appError.details ?? null) : null;

  const logContext: Record<string, unknown> = {
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    statusCode,
    code,
  };
  if (error instanceof Error && error.stack) {
    logContext.stack = error.stack;
  }

  const logMessage = error instanceof Error ? error.message : 'Non-error value thrown';
  if (statusCode >= 500) {
    logger.error(logMessage, logContext);
  } else {
    logger.warn(logMessage, logContext);
  }

  const body: ErrorResponseBody = {
    error: { code, message: clientMessage, details, requestId: request.requestId },
  };

  response.status(statusCode).json(body);
}
