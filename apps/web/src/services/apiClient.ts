import { ErrorCode } from '@foka-vote/shared';
import type { ErrorResponseBody, ListQuery } from '@foka-vote/shared';

const API_URL = import.meta.env.VITE_API_URL;

export class NetworkError extends Error {
  constructor() {
    super('Network error');
    this.name = 'NetworkError';
  }
}

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  }).catch(() => {
    throw new NetworkError();
  });
}

export function listQueryString(query: ListQuery): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(name, String(value));
    }
  }
  const search = params.toString();
  return search.length > 0 ? `?${search}` : '';
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export function apiUploadWithProgress(
  path: string,
  formData: FormData,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'));
      return;
    }
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
    xhr.onerror = () => reject(new NetworkError());
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
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
