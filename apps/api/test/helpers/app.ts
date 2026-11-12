import request, { type Agent } from 'supertest';
import { createApp } from '../../src/app.js';
import { TEST_ADMIN_PASSWORD } from '../env.js';

export const app = createApp();

export function api(): Agent {
  return request(app);
}

export function agent(): Agent {
  return request.agent(app);
}

export async function loginAsAdmin(): Promise<Agent> {
  const admin = agent();
  await admin.post('/api/admin/login').send({ password: TEST_ADMIN_PASSWORD }).expect(204);
  return admin;
}
