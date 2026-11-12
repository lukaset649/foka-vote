import { MAX_CONTEST_TOPIC_TITLE_LENGTH, type ContestTopicDto } from '@foka-vote/shared';
import type { Agent } from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { createTopic } from '../factories.js';
import { loginAsAdmin } from '../helpers/app.js';
import { errorCode } from '../helpers/responses.js';

let admin: Agent;

beforeEach(async () => {
  admin = await loginAsAdmin();
});

describe('GET /api/admin/contest-topics', () => {
  it('lists all topics, oldest first', async () => {
    await prisma.contestTopic.create({
      data: { title: 'Newer', createdAt: new Date('2026-02-01') },
    });
    await prisma.contestTopic.create({
      data: { title: 'Older', createdAt: new Date('2026-01-01') },
    });

    const response = await admin.get('/api/admin/contest-topics').expect(200);

    expect(response.body).toEqual([
      { id: expect.any(String) as unknown, title: 'Older', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: expect.any(String) as unknown, title: 'Newer', createdAt: '2026-02-01T00:00:00.000Z' },
    ]);
  });

  it('returns an empty list', async () => {
    const response = await admin.get('/api/admin/contest-topics').expect(200);

    expect(response.body).toEqual([]);
  });
});

describe('POST /api/admin/contest-topics', () => {
  it('creates a topic with a trimmed, single-spaced title', async () => {
    const response = await admin
      .post('/api/admin/contest-topics')
      .send({ title: '  Morze   i  góry ' })
      .expect(201);

    expect((response.body as ContestTopicDto).title).toBe('Morze i góry');
    expect(await prisma.contestTopic.count()).toBe(1);
  });

  it('accepts a title of the maximum length', async () => {
    await admin
      .post('/api/admin/contest-topics')
      .send({ title: 'a'.repeat(MAX_CONTEST_TOPIC_TITLE_LENGTH) })
      .expect(201);
  });

  it.each([
    ['a missing title', {}],
    ['a non-string title', { title: 1 }],
    ['a blank title', { title: '   ' }],
    ['a too long title', { title: 'a'.repeat(MAX_CONTEST_TOPIC_TITLE_LENGTH + 1) }],
  ])('rejects %s', async (_case, body) => {
    const response = await admin.post('/api/admin/contest-topics').send(body).expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('rejects a duplicate that differs only in case and spacing', async () => {
    await createTopic('Morze i góry');

    const response = await admin
      .post('/api/admin/contest-topics')
      .send({ title: ' MORZE  I GÓRY' })
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
    expect(await prisma.contestTopic.count()).toBe(1);
  });
});

describe('PATCH /api/admin/contest-topics/:id', () => {
  it('renames the topic', async () => {
    const topic = await createTopic('Old');

    const response = await admin
      .patch(`/api/admin/contest-topics/${topic.id}`)
      .send({ title: ' New ' })
      .expect(200);

    expect(response.body).toEqual({
      id: topic.id,
      title: 'New',
      createdAt: topic.createdAt.toISOString(),
    });
  });

  it('allows changing only the letter case of its own title', async () => {
    const topic = await createTopic('morze');

    await admin.patch(`/api/admin/contest-topics/${topic.id}`).send({ title: 'Morze' }).expect(200);
  });

  it('rejects the title of another topic', async () => {
    await createTopic('Taken');
    const topic = await createTopic('Mine');

    const response = await admin
      .patch(`/api/admin/contest-topics/${topic.id}`)
      .send({ title: 'taken' })
      .expect(409);

    expect(errorCode(response)).toBe('CONFLICT');
  });

  it('rejects an invalid title', async () => {
    const topic = await createTopic();

    const response = await admin
      .patch(`/api/admin/contest-topics/${topic.id}`)
      .send({ title: '' })
      .expect(400);

    expect(errorCode(response)).toBe('VALIDATION_FAILED');
  });

  it('answers 404 for an unknown id', async () => {
    const response = await admin
      .patch('/api/admin/contest-topics/missing')
      .send({ title: 'x' })
      .expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});

describe('DELETE /api/admin/contest-topics/:id', () => {
  it('deletes the topic', async () => {
    const topic = await createTopic();
    const other = await createTopic();

    await admin.delete(`/api/admin/contest-topics/${topic.id}`).expect(204);

    expect(await prisma.contestTopic.findMany()).toEqual([other]);
  });

  it('answers 404 for an unknown id', async () => {
    const response = await admin.delete('/api/admin/contest-topics/missing').expect(404);

    expect(errorCode(response)).toBe('NOT_FOUND');
  });
});
