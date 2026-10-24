import type { NextFunction, Request, Response } from 'express';
import { ErrorCode, type ErrorResponseBody } from '@foka-vote/shared';
import { AppError, badRequest } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';

// body-parser rejects malformed or oversized bodies with an http-errors object (4xx `status`, `expose: true`).
function toClientAppError(error: unknown): AppError | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const { status, expose, type } = error as { status?: unknown; expose?: unknown; type?: unknown };
  if (typeof status !== 'number' || status < 400 || status >= 500 || expose !== true) {
    return null;
  }
  if (type === 'entity.parse.failed') {
    return badRequest('Malformed request body');
  }
  return new AppError(ErrorCode.VALIDATION_FAILED, status, (error as Error).message);
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

  const appError = error instanceof AppError ? error : toClientAppError(error);
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
