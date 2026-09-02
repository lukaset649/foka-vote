import { ErrorCode } from '@foka-vote/shared';
import type { ErrorResponseBody } from '@foka-vote/shared';

const API_URL = import.meta.env.VITE_API_URL;

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  });
}

export function apiUploadWithProgress(
  path: string,
  formData: FormData,
  onProgress?: (fraction: number) => void,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
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

export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.code === ErrorCode.UNAUTHORIZED;
}

export async function apiErrorFrom(response: Response, fallback: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as ErrorResponseBody;
    return new ApiError(body.error.message, body.error.code);
  } catch {
    return new ApiError(fallback, ErrorCode.INTERNAL_ERROR);
  }
}
