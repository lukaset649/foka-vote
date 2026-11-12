import { NICKNAME_POOL } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import { pickAvailableAlias } from '../../src/lib/nickname.js';

describe('pickAvailableAlias', () => {
  it('picks an alias from the pool', () => {
    expect(NICKNAME_POOL).toContain(pickAvailableAlias([]));
  });

  it('never picks a used alias', () => {
    const [free, ...used] = NICKNAME_POOL;

    expect(pickAvailableAlias(used)).toBe(free);
  });

  it('returns null when the pool is exhausted', () => {
    expect(pickAvailableAlias(NICKNAME_POOL)).toBeNull();
  });
});
