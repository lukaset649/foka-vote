import { describe, expect, it } from 'vitest';
import { computeContestStatus } from '../../src/lib/contest-status.js';

const dates = {
  submissionStart: new Date('2026-03-01T00:00:00Z'),
  submissionDeadline: new Date('2026-03-10T00:00:00Z'),
  votingStart: new Date('2026-03-15T00:00:00Z'),
  votingEnd: new Date('2026-03-20T00:00:00Z'),
};

describe('computeContestStatus', () => {
  it.each([
    ['2026-02-28T23:59:59Z', 'DRAFT'],
    ['2026-03-01T00:00:00Z', 'SUBMISSIONS'],
    ['2026-03-12T00:00:00Z', 'SUBMISSIONS'],
    ['2026-03-15T00:00:00Z', 'VOTING'],
    ['2026-03-19T23:59:59Z', 'VOTING'],
    ['2026-03-20T00:00:00Z', 'CLOSED'],
  ])('at %s is %s', (now, expected) => {
    expect(computeContestStatus(new Date(now), dates)).toBe(expected);
  });
});
