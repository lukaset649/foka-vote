import { NICKNAME_POOL } from '@foka-vote/shared';

export function pickAvailableAlias(usedAliases: readonly string[]): string | null {
  const usedSet = new Set(usedAliases);
  const available = NICKNAME_POOL.filter((alias) => !usedSet.has(alias));

  if (available.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? null;
}
