import type { Request, Response } from 'express';
import type { CreateAlbumDto, UpdateAlbumDto, UpdateAlbumPhotoDto } from '@foka-vote/shared';
import { badRequest } from '../../../errors/app-error.js';
import { parseListQuery } from '../../../lib/list-query.js';
import { requireParam } from '../../../lib/request-params.js';
import {
  createAdminAlbum,
  deleteAdminAlbum,
  deleteAdminAlbumPhoto,
  getAdminAlbum,
  listAdminAlbumPhotos,
  listAdminAlbums,
  setAdminAlbumVisibility,
  setContestAlbumVisibility,
  updateAdminAlbum,
  updateAdminAlbumPhoto,
} from './service.js';

function parseHidden(body: unknown): boolean {
  const { hidden } = (body ?? {}) as Record<string, unknown>;
  if (typeof hidden !== 'boolean') {
    throw badRequest('hidden must be a boolean');
  }
  return hidden;
}

export async function list(request: Request, response: Response): Promise<void> {
  const albums = await listAdminAlbums(parseListQuery(request.query));
  response.json(albums);
}

export async function getOne(request: Request, response: Response): Promise<void> {
  const album = await getAdminAlbum(requireParam(request, 'id'));
  response.json(album);
}

function parseAlbumFields(body: unknown): UpdateAlbumDto {
  const { title, description, accessCode } = (body ?? {}) as Record<string, unknown>;

  if (title !== undefined && typeof title !== 'string') {
    throw badRequest('title must be a string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw badRequest('description must be a string');
  }
  if (accessCode !== undefined && typeof accessCode !== 'string') {
    throw badRequest('accessCode must be a string');
  }

  return {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(accessCode !== undefined ? { accessCode } : {}),
  };
}

export async function create(request: Request, response: Response): Promise<void> {
  const input = parseAlbumFields(request.body);

  if (input.title === undefined) {
    throw badRequest('title is required');
  }

  const album = await createAdminAlbum(input as CreateAlbumDto);
  response.status(201).json(album);
}

export async function update(request: Request, response: Response): Promise<void> {
  const album = await updateAdminAlbum(requireParam(request, 'id'), parseAlbumFields(request.body));
  response.json(album);
}

export async function setVisibility(request: Request, response: Response): Promise<void> {
  const album = await setAdminAlbumVisibility(
    requireParam(request, 'id'),
    parseHidden(request.body),
  );
  response.json(album);
}

export async function remove(request: Request, response: Response): Promise<void> {
  await deleteAdminAlbum(requireParam(request, 'id'));
  response.status(204).end();
}

export async function setContestVisibility(request: Request, response: Response): Promise<void> {
  const album = await setContestAlbumVisibility(
    requireParam(request, 'contestId'),
    parseHidden(request.body),
  );
  response.json(album);
}

export async function listPhotos(request: Request, response: Response): Promise<void> {
  const photos = await listAdminAlbumPhotos(requireParam(request, 'id'));
  response.json(photos);
}

export async function updatePhoto(request: Request, response: Response): Promise<void> {
  const { title, description } = request.body as Record<string, unknown>;

  if (title !== undefined && typeof title !== 'string') {
    throw badRequest('title must be a string');
  }
  if (description !== undefined && typeof description !== 'string') {
    throw badRequest('description must be a string');
  }

  const input: UpdateAlbumPhotoDto = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
  };

  const photo = await updateAdminAlbumPhoto(
    requireParam(request, 'id'),
    requireParam(request, 'photoId'),
    input,
  );
  response.json(photo);
}

export async function removePhoto(request: Request, response: Response): Promise<void> {
  await deleteAdminAlbumPhoto(requireParam(request, 'id'), requireParam(request, 'photoId'));
  response.status(204).end();
}
