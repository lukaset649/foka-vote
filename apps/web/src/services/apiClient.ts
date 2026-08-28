import { ErrorCode } from '@foka-vote/shared';
import type { ErrorResponseBody } from '@foka-vote/shared';

const API_URL = import.meta.env.VITE_API_URL;

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  });
}

export function mediaUrl(path: string): string {
  return `${API_URL}${path}`;
}

export class ApiError extends Error {
  code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export async function apiErrorFrom(response: Response, fallback: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    return new ApiError(body.error.message, body.error.code);
  } catch {
    return new ApiError(fallback, ErrorCode.INTERNAL_ERROR);
  }
}
