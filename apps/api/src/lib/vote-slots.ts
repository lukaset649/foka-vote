import { MAX_VOTE_SLOTS, VOTE_WEIGHTS } from '@foka-vote/shared';

export function computeVoteSlots(totalSubmissions: number): number {
  return Math.min(MAX_VOTE_SLOTS, totalSubmissions);
}

export function expectedPoints(slots: number): number[] {
  return VOTE_WEIGHTS.slice(0, slots);
}
