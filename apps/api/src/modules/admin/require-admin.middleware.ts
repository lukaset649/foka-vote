import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../../errors/app-error.js';
import { ADMIN_SESSION_COOKIE_NAME } from './service.js';

export function requireAdmin(request: Request, _response: Response, next: NextFunction): void {
  if (request.signedCookies[ADMIN_SESSION_COOKIE_NAME] !== '1') {
    next(unauthorized());
    return;
  }

  next();
}
