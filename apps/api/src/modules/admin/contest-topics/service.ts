import { MAX_CONTEST_TOPIC_TITLE_LENGTH } from '@foka-vote/shared';
import type { ContestTopicDto, SaveContestTopicDto } from '@foka-vote/shared';
import type { ContestTopic } from '../../../generated/prisma/client.js';
import { badRequest, conflict, notFound } from '../../../errors/app-error.js';
import { isUniqueConstraintError, prisma } from '../../../lib/prisma.js';

function toContestTopicDto(topic: ContestTopic): ContestTopicDto {
  return {
    id: topic.id,
    title: topic.title,
    createdAt: topic.createdAt.toISOString(),
  };
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    throw badRequest('title must not be empty');
  }
  if (trimmed.length > MAX_CONTEST_TOPIC_TITLE_LENGTH) {
    throw badRequest(`title must be at most ${MAX_CONTEST_TOPIC_TITLE_LENGTH} characters`);
  }
  return trimmed;
}

function duplicateTitle(title: string) {
  return conflict(`Topic "${title}" already exists`);
}

// Titles differing only in letter case count as the same topic, so the wheel never gets
// two segments for one idea; the unique index still catches exact duplicates under a race.
async function ensureUniqueTitle(title: string, excludeId?: string): Promise<void> {
  const existing = await prisma.contestTopic.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (existing) {
    throw duplicateTitle(existing.title);
  }
}

async function saveTopic<T>(title: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw duplicateTitle(title);
    }
    throw error;
  }
}

async function requireTopic(id: string): Promise<ContestTopic> {
  const topic = await prisma.contestTopic.findUnique({ where: { id } });
  if (!topic) {
    throw notFound('Contest topic not found');
  }
  return topic;
}

export async function listContestTopics(): Promise<ContestTopicDto[]> {
  const topics = await prisma.contestTopic.findMany({ orderBy: { createdAt: 'asc' } });
  return topics.map(toContestTopicDto);
}

export async function createContestTopic(input: SaveContestTopicDto): Promise<ContestTopicDto> {
  const title = normalizeTitle(input.title);
  await ensureUniqueTitle(title);

  const topic = await saveTopic(title, () => prisma.contestTopic.create({ data: { title } }));
  return toContestTopicDto(topic);
}

export async function updateContestTopic(
  id: string,
  input: SaveContestTopicDto,
): Promise<ContestTopicDto> {
  await requireTopic(id);
  const title = normalizeTitle(input.title);
  await ensureUniqueTitle(title, id);

  const topic = await saveTopic(title, () =>
    prisma.contestTopic.update({ where: { id }, data: { title } }),
  );
  return toContestTopicDto(topic);
}

export async function deleteContestTopic(id: string): Promise<void> {
  await requireTopic(id);
  await prisma.contestTopic.delete({ where: { id } });
}
