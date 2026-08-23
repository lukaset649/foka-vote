import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(plain, salt, KEY_LENGTH);
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const storedHash = Buffer.from(hashHex, 'hex');
  const derivedKey = scryptSync(plain, salt, KEY_LENGTH);

  return derivedKey.length === storedHash.length && timingSafeEqual(derivedKey, storedHash);
}
