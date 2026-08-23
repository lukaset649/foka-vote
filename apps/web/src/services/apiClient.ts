const API_URL = import.meta.env.VITE_API_URL;

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  });
}
