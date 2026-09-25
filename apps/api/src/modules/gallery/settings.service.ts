import type { AdminGallerySettingsDto } from '@foka-vote/shared';
import { badRequest, unauthorized } from '../../errors/app-error.js';
import { prisma } from '../../lib/prisma.js';

const GALLERY_ACCESS_CODE_KEY = 'GALLERY_ACCESS_CODE';

export const GALLERY_ACCESS_COOKIE_NAME = 'gallery_access';
export const GALLERY_ACCESS_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Returns null when the gate is disabled, i.e. no code has been set by the admin. */
export async function getGalleryAccessCode(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: GALLERY_ACCESS_CODE_KEY } });
  if (!setting || setting.value.length === 0) {
    return null;
  }
  return setting.value;
}

export async function setGalleryAccessCode(code: string | null): Promise<void> {
  // An empty code is stored as "no row" so the gate has a single disabled representation.
  const value = code === null ? '' : code.trim();

  if (value.length === 0) {
    await prisma.setting.deleteMany({ where: { key: GALLERY_ACCESS_CODE_KEY } });
    return;
  }

  await prisma.setting.upsert({
    where: { key: GALLERY_ACCESS_CODE_KEY },
    create: { key: GALLERY_ACCESS_CODE_KEY, value },
    update: { value },
  });
}

export async function getGallerySettings(): Promise<AdminGallerySettingsDto> {
  return { accessCode: await getGalleryAccessCode() };
}

export async function verifyGalleryAccessCode(code: string): Promise<void> {
  const currentCode = await getGalleryAccessCode();
  if (currentCode === null) {
    throw badRequest('The gallery does not require an access code');
  }
  if (code !== currentCode) {
    throw unauthorized('Invalid access code');
  }
}

export async function assertGalleryAccess(
  signedCookies: Record<string, string | undefined>,
): Promise<void> {
  const currentCode = await getGalleryAccessCode();
  if (currentCode === null) {
    return;
  }
  // Comparing against the current code means changing it invalidates every old cookie.
  if (signedCookies[GALLERY_ACCESS_COOKIE_NAME] !== currentCode) {
    throw unauthorized('Access code required');
  }
}
