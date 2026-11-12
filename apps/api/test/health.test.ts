import type { ErrorResponseBody } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import { api } from './helpers/app.js';

describe('GET /api/health', () => {
  it('reports ok with a reachable database', async () => {
    const response = await api().get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      environment: 'test',
      database: 'ok',
    });
  });
});

describe('unknown routes', () => {
  it('answers 404 with the error body', async () => {
    const response = await api().get('/api/does-not-exist').expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body.error).toMatchObject({ code: 'NOT_FOUND', details: null });
    expect(body.error.message).toBeTypeOf('string');
    expect(body.error.requestId).toBeTypeOf('string');
  });
});
