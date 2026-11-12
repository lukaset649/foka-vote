import type { Response } from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { TEST_ADMIN_PASSWORD } from '../env.js';
import { createContest } from '../factories.js';
import { agent, api, loginAsAdmin } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

function setCookieHeaders(response: Response): string[] {
  const header = response.headers['set-cookie'] as string[] | string | undefined;
  if (header === undefined) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}

function sessionCookie(response: Response): string | undefined {
  return setCookieHeaders(response).find((cookie) => cookie.startsWith('admin_session='));
}

describe('POST /api/admin/login', () => {
  it('sets a signed, http-only session cookie for the right password', async () => {
    const response = await api()
      .post('/api/admin/login')
      .send({ password: TEST_ADMIN_PASSWORD })
      .expect(204);

    const cookie = sessionCookie(response);
    expect(cookie).toMatch(/^admin_session=s%3A1\./);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=43200');
    expect(cookie).not.toContain('Secure');
  });

  it('rejects a wrong password', async () => {
    const response = await api()
      .post('/api/admin/login')
      .send({ password: 'wrong-password' })
      .expect(401);

    expect(errorCode(response)).toBe('UNAUTHORIZED');
    expect(sessionCookie(response)).toBeUndefined();
  });

  it.each([
    ['a missing password', {}],
    ['an empty password', { password: '' }],
    ['a non-string password', { password: 123 }],
  ])('rejects %s', async (_case, body) => {
    const response = await api().post('/api/admin/login').send(body).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('rejects a request without a body', async () => {
    const response = await api().post('/api/admin/login').expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });
});

describe('GET /api/admin/me', () => {
  it('confirms an authenticated session', async () => {
    const admin = await loginAsAdmin();

    const response = await admin.get('/api/admin/me').expect(200);

    expect(response.body).toEqual({ authenticated: true });
  });

  it('rejects a request without a session', async () => {
    const response = await api().get('/api/admin/me').expect(401);

    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });

  it('rejects an unsigned session cookie', async () => {
    await api().get('/api/admin/me').set('Cookie', 'admin_session=1').expect(401);
  });

  it('rejects a session cookie with a forged signature', async () => {
    await api()
      .get('/api/admin/me')
      .set('Cookie', 'admin_session=s%3A1.forgedsignature')
      .expect(401);
  });
});

describe('POST /api/admin/logout', () => {
  it('clears the session', async () => {
    const admin = await loginAsAdmin();

    const response = await admin.post('/api/admin/logout').expect(204);

    expect(sessionCookie(response)).toMatch(/^admin_session=;.*Expires=Thu, 01 Jan 1970/);
    await admin.get('/api/admin/me').expect(401);
  });

  it('succeeds without a session', async () => {
    await api().post('/api/admin/logout').expect(204);
  });

  it('allows logging in again afterwards', async () => {
    const admin = agent();
    await admin.post('/api/admin/login').send({ password: TEST_ADMIN_PASSWORD }).expect(204);
    await admin.post('/api/admin/logout').expect(204);
    await admin.post('/api/admin/login').send({ password: TEST_ADMIN_PASSWORD }).expect(204);

    await admin.get('/api/admin/me').expect(200);
  });
});

describe('admin routes without a session', () => {
  const routes: [method: 'get' | 'post' | 'patch' | 'delete', path: string][] = [
    ['get', '/api/admin/me'],
    ['get', '/api/admin/contests'],
    ['post', '/api/admin/contests'],
    ['get', '/api/admin/contests/c1'],
    ['patch', '/api/admin/contests/c1'],
    ['delete', '/api/admin/contests/c1'],
    ['get', '/api/admin/contests/c1/submissions'],
    ['get', '/api/admin/contests/c1/submissions/s1'],
    ['patch', '/api/admin/contests/c1/submissions/s1'],
    ['delete', '/api/admin/contests/c1/submissions/s1'],
    ['patch', '/api/admin/contests/c1/submissions/s1/artworks/order'],
    ['post', '/api/admin/contests/c1/submissions/s1/artworks/a1/replace'],
    ['patch', '/api/admin/contests/c1/submissions/s1/artworks/a1'],
    ['delete', '/api/admin/contests/c1/submissions/s1/artworks/a1'],
    ['get', '/api/admin/contests/c1/vote-cards'],
    ['post', '/api/admin/contests/c1/vote-cards/v1/void'],
    ['post', '/api/admin/contests/c1/vote-cards/v1/unvoid'],
    ['get', '/api/admin/contest-topics'],
    ['post', '/api/admin/contest-topics'],
    ['patch', '/api/admin/contest-topics/t1'],
    ['delete', '/api/admin/contest-topics/t1'],
    ['get', '/api/admin/gallery/albums'],
    ['post', '/api/admin/gallery/albums'],
    ['get', '/api/admin/gallery/albums/a1'],
    ['patch', '/api/admin/gallery/albums/a1'],
    ['patch', '/api/admin/gallery/albums/a1/visibility'],
    ['delete', '/api/admin/gallery/albums/a1'],
    ['get', '/api/admin/gallery/albums/a1/photos'],
    ['patch', '/api/admin/gallery/albums/a1/photos/p1'],
    ['delete', '/api/admin/gallery/albums/a1/photos/p1'],
    ['patch', '/api/admin/gallery/contests/c1/visibility'],
  ];

  it.each(routes)('%s %s answers 401', async (method, path) => {
    const response = await api()[method](path).expect(401);

    expect(errorCode(response)).toBe('UNAUTHORIZED');
  });

  it('does not run the handler', async () => {
    const contest = await createContest();

    await api().delete(`/api/admin/contests/${contest.id}`).expect(401);

    expect(await prisma.contest.count()).toBe(1);
  });
});
