import { describe, expect, it } from 'vitest';
import { computeVoteSlots, expectedPoints } from '../../src/lib/vote-slots.js';

describe('computeVoteSlots', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [10, 3],
  ])('%i submissions give %i slots', (submissions, slots) => {
    expect(computeVoteSlots(submissions)).toBe(slots);
  });
});

describe('expectedPoints', () => {
  it.each([
    [0, []],
    [1, [3]],
    [2, [3, 2]],
    [3, [3, 2, 1]],
  ])('%i slots expect %j', (slots, points) => {
    expect(expectedPoints(slots)).toEqual(points);
  });
});
