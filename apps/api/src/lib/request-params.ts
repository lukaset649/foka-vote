import type { Request } from 'express';
import { badRequest } from '../errors/app-error.js';

export function requireParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw badRequest(`${name} is required`);
  }
  return value;
}
