import type { Request, Response } from 'express';
import { badRequest } from '../../../errors/app-error.js';
import { getGallerySettings, setGalleryAccessCode } from '../../gallery/settings.service.js';

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
