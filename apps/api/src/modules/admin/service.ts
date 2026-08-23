import { env } from '../../config/env.js';
import { verifyPassword } from '../../lib/password.js';

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session';
export const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function verifyAdminPassword(password: string): boolean {
  return verifyPassword(password, env.ADMIN_PASSWORD_HASH);
}
