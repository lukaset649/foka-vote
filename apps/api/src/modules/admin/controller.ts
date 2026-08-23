import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { badRequest, unauthorized } from '../../errors/app-error.js';
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_MS,
  verifyAdminPassword,
} from './service.js';

export function login(request: Request, response: Response): void {
  const { password } = request.body as { password?: unknown };

  if (typeof password !== 'string' || password.length === 0) {
    throw badRequest('Password is required');
  }

  if (!verifyAdminPassword(password)) {
    throw unauthorized('Invalid password');
  }

  response.cookie(ADMIN_SESSION_COOKIE_NAME, '1', {
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: ADMIN_SESSION_MAX_AGE_MS,
  });
  response.status(204).end();
}

export function logout(_request: Request, response: Response): void {
  response.clearCookie(ADMIN_SESSION_COOKIE_NAME);
  response.status(204).end();
}

export function me(_request: Request, response: Response): void {
  response.json({ authenticated: true });
}
