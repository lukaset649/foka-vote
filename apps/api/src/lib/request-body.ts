import { badRequest } from '../errors/app-error.js';

export type RequestBody = Record<string, unknown>;

export function requireObjectBody(body: unknown): RequestBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }
  return body as RequestBody;
}

export function parseRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function parseOptionalText(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'string') {
    throw badRequest(`${field} must be a string or null`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
