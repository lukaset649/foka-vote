import { apiRequest } from './apiClient';

export async function adminLogin(password: string): Promise<boolean> {
  const response = await apiRequest('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return response.ok;
}

export async function adminLogout(): Promise<void> {
  await apiRequest('/api/admin/logout', { method: 'POST' });
}

export async function fetchAdminSession(): Promise<boolean> {
  const response = await apiRequest('/api/admin/me');
  return response.ok;
}
