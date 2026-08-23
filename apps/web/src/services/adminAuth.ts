const API_URL = import.meta.env.VITE_API_URL;

function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  });
}

export async function adminLogin(password: string): Promise<boolean> {
  const response = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.ok;
}

export async function adminLogout(): Promise<void> {
  await request('/api/admin/logout', { method: 'POST' });
}

export async function fetchAdminSession(): Promise<boolean> {
  const response = await request('/api/admin/me');
  return response.ok;
}
