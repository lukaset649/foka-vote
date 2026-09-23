import type { Request, Response } from 'express';
import type { ModerationStatus, UpdateAlbumDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import { getGallerySettings, setGalleryAccessCode } from '../../gallery/settings.service.js';
import {
  deleteAdminAlbum,
  getAdminAlbum,
  listAdminAlbums,
  setAdminAlbumStatus,
  setAdminAlbumVisibility,
  setContestAlbumVisibility,
  updateAdminAlbum,
} from './service.js';

const DECIDABLE_STATUSES: ModerationStatus[] = ['APPROVED', 'REJECTED'];

function requireIdParam(request: Request, name: 'id' | 'contestId'): string {
  const value = request.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw badRequest(`${name} is required`);
  }
  return value;
}

function parseHidden(body: unknown): boolean {
  const { hidden } = (body ?? {}) as Record<string, unknown>;
  if (typeof hidden !== 'boolean') {
    throw badRequest('hidden must be a boolean');
  }
  return hidden;
}

export async function getSettings(_request: Request, response: Response): Promise<void> {
  const settings = await getGallerySettings();
  response.json(settings);
}

export async function updateSettings(request: Request, response: Response): Promise<void> {
  const { accessCode } = request.body as Record<string, unknown>;

  if (accessCode === undefined) {
    throw badRequest('accessCode is required');
  }
  if (accessCode !== null && typeof accessCode !== 'string') {
    throw badRequest('accessCode must be a string or null');
  }

  await setGalleryAccessCode(accessCode);

  const settings = await getGallerySettings();
  response.json(settings);
}

export async function list(_request: Request, response: Response): Promise<void> {
  const albums = await listAdminAlbums();
  response.json(albums);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const album = await getAdminAlbum(requireIdParam(request, 'id'));
  response.json(album);
}

export async function update(request: Request, response: Response): Promise<void> {
  const { title, description } = request.body as Record<string, unknown>;

  if (title !== undefined && typeof title !== 'string') {
    throw badRequest('title must be a string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw badRequest('description must be a string');
  }

  const input: UpdateAlbumDto = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
  };

  const album = await updateAdminAlbum(requireIdParam(request, 'id'), input);
  response.json(album);
}

export async function setStatus(request: Request, response: Response): Promise<void> {
  const { status } = request.body as Record<string, unknown>;

  if (typeof status !== 'string' || !DECIDABLE_STATUSES.includes(status as ModerationStatus)) {
    throw badRequest(`status must be one of: ${DECIDABLE_STATUSES.join(', ')}`);
  }

  const album = await setAdminAlbumStatus(
    requireIdParam(request, 'id'),
    status as ModerationStatus,
  );
  response.json(album);
}

export async function setVisibility(request: Request, response: Response): Promise<void> {
  const album = await setAdminAlbumVisibility(
    requireIdParam(request, 'id'),
    parseHidden(request.body),
  );
  response.json(album);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteAdminAlbum(requireIdParam(request, 'id'));
  response.status(204).end();
}

export async function setContestVisibility(request: Request, response: Response): Promise<void> {
  const album = await setContestAlbumVisibility(
    requireIdParam(request, 'contestId'),
    parseHidden(request.body),
  );
  response.json(album);
}
