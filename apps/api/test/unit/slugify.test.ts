import { describe, expect, it } from 'vitest';
import { slugify } from '../../src/lib/slugify.js';

describe('slugify', () => {
  it.each([
    ['Wiosna 2026', 'wiosna-2026'],
    ['Zażółć gęślą jaźń', 'zazolc-gesla-jazn'],
    ['ŁÓDŹ ŚWIĘTA', 'lodz-swieta'],
    ['  --Hello,   World!--  ', 'hello-world'],
    ['a/b_c.d', 'a-b-c-d'],
    ['!!!', ''],
  ])('%j becomes %j', (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });
});
