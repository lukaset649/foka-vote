import { LIST_PAGE_SIZE, MAX_LIST_PAGE_SIZE, MAX_LIST_SEARCH_LENGTH } from '@foka-vote/shared';
import { describe, expect, it } from 'vitest';
import {
  paginateKeys,
  paginateRows,
  parseListQuery,
  titleSearchFilter,
  type ListKey,
  type ParsedListQuery,
} from '../../src/lib/list-query.js';
import { expectAppError } from '../helpers/errors.js';

describe('parseListQuery', () => {
  it('applies defaults', () => {
    expect(parseListQuery({})).toEqual({
      q: null,
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: LIST_PAGE_SIZE,
    });
  });

  it('defaults title sorting to ascending order', () => {
    expect(parseListQuery({ sort: 'title' })).toMatchObject({ sort: 'title', order: 'asc' });
  });

  it('parses all parameters', () => {
    expect(
      parseListQuery({ q: '  wiosna ', sort: 'title', order: 'desc', page: '3', pageSize: '20' }),
    ).toEqual({ q: 'wiosna', sort: 'title', order: 'desc', page: 3, pageSize: 20 });
  });

  it('treats a blank search as no search', () => {
    expect(parseListQuery({ q: '   ' }).q).toBeNull();
  });

  it('accepts the maximum page size and search length', () => {
    expect(
      parseListQuery({
        pageSize: String(MAX_LIST_PAGE_SIZE),
        q: 'a'.repeat(MAX_LIST_SEARCH_LENGTH),
      }),
    ).toMatchObject({ pageSize: MAX_LIST_PAGE_SIZE });
  });

  it.each([
    ['repeated parameter', { page: ['1', '2'] }],
    ['too long search', { q: 'a'.repeat(MAX_LIST_SEARCH_LENGTH + 1) }],
    ['unknown sort', { sort: 'id' }],
    ['unknown order', { order: 'up' }],
    ['zero page', { page: '0' }],
    ['negative page', { page: '-1' }],
    ['fractional page', { page: '1.5' }],
    ['non-numeric page', { page: 'abc' }],
    ['zero page size', { pageSize: '0' }],
    ['too large page size', { pageSize: String(MAX_LIST_PAGE_SIZE + 1) }],
  ])('rejects %s', (_case, query) => {
    expectAppError(() => parseListQuery(query), 400, 'VALIDATION_FAILED');
  });
});

describe('titleSearchFilter', () => {
  it('returns no filter without a search', () => {
    expect(titleSearchFilter(null)).toEqual({});
  });

  it('escapes LIKE wildcards and backslashes', () => {
    expect(titleSearchFilter('50%_off\\')).toEqual({
      title: { contains: '50\\%\\_off\\\\', mode: 'insensitive' },
    });
  });
});

function key(id: string, title: string, createdAt: string): ListKey {
  return { id, title, createdAt: new Date(createdAt) };
}

function listQuery(overrides: Partial<ParsedListQuery>): ParsedListQuery {
  return { q: null, sort: 'createdAt', order: 'desc', page: 1, pageSize: 10, ...overrides };
}

const keys = [
  key('1', 'Zima', '2026-01-01'),
  key('2', 'Łąka', '2026-02-01'),
  key('3', 'Auto 10', '2026-03-01'),
  key('4', 'auto 9', '2026-03-01'),
  key('5', 'Lato', '2026-04-01'),
];

function ids(items: ListKey[]): string[] {
  return items.map((item) => item.id);
}

describe('paginateKeys', () => {
  it('sorts by creation date, newest first, ties by id', () => {
    expect(ids(paginateKeys(keys, listQuery({})).items)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('sorts titles with Polish collation, case-insensitively and numerically', () => {
    expect(ids(paginateKeys(keys, listQuery({ sort: 'title', order: 'asc' })).items)).toEqual([
      '4',
      '3',
      '5',
      '2',
      '1',
    ]);
  });

  it('returns the requested page with totals', () => {
    expect(paginateKeys(keys, listQuery({ page: 2, pageSize: 2 }))).toEqual({
      items: [keys[2], keys[1]],
      total: 5,
      page: 2,
      pageSize: 2,
    });
  });

  it('returns an empty page past the end', () => {
    expect(paginateKeys(keys, listQuery({ page: 9 })).items).toEqual([]);
  });

  it('does not mutate the input', () => {
    const copy = [...keys];
    paginateKeys(keys, listQuery({ sort: 'title' }));

    expect(keys).toEqual(copy);
  });
});

describe('paginateRows', () => {
  it('loads only the page keys and keeps their order, skipping missing rows', async () => {
    const loaded: string[][] = [];

    const page = await paginateRows(
      keys,
      listQuery({ pageSize: 3 }),
      (pageKeys) => {
        loaded.push(ids(pageKeys));
        return Promise.resolve(
          pageKeys
            .filter((pageKey) => pageKey.id !== '4')
            .reverse()
            .map((pageKey) => ({ rowId: pageKey.id })),
        );
      },
      (entry) => ('rowId' in entry ? entry.rowId : entry.id),
    );

    expect(loaded).toEqual([['5', '4', '3']]);
    expect(page).toEqual({
      items: [{ rowId: '5' }, { rowId: '3' }],
      total: 5,
      page: 1,
      pageSize: 3,
    });
  });
});
