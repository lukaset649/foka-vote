import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('password hashing', () => {
  it('verifies the hashed password', () => {
    expect(verifyPassword('secret', hashPassword('secret'))).toBe(true);
  });

  it('rejects a different password', () => {
    expect(verifyPassword('other', hashPassword('secret'))).toBe(false);
  });

  it('salts every hash', () => {
    expect(hashPassword('secret')).not.toBe(hashPassword('secret'));
  });

  it.each(['', 'no-separator', ':abcd', 'abcd:'])('rejects malformed stored value %j', (stored) => {
    expect(verifyPassword('secret', stored)).toBe(false);
  });
});
