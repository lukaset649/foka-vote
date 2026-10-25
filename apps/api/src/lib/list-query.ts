import type { ListSort, PaginatedDto, SortOrder } from '@foka-vote/shared';
import { LIST_PAGE_SIZE, MAX_LIST_PAGE_SIZE, MAX_LIST_SEARCH_LENGTH } from '@foka-vote/shared';
import { badRequest } from '../errors/app-error.js';

export interface ParsedListQuery {
  q: string | null;
  sort: ListSort;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export interface ListKey {
  id: string;
  title: string;
  createdAt: Date;
}

const SORTS: readonly ListSort[] = ['createdAt', 'title'];
const ORDERS: readonly SortOrder[] = ['asc', 'desc'];

// The alpine Postgres image (musl) compares text bytewise, which would put "Ł" after "Z",
// so title ordering is done here instead of in ORDER BY.
const titleCollator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });

function singleValue(query: Record<string, unknown>, name: string): string | undefined {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw badRequest(`${name} must be a single value`);
  }
  return value;
}

function parsePositiveInt(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw badRequest(`${name} must be a positive integer`);
  }
  return Number(value);
}

export function parseListQuery(query: Record<string, unknown>): ParsedListQuery {
  const rawQ = singleValue(query, 'q')?.trim() ?? '';
  if (rawQ.length > MAX_LIST_SEARCH_LENGTH) {
    throw badRequest(`q must be at most ${MAX_LIST_SEARCH_LENGTH} characters long`);
  }

  const rawSort = singleValue(query, 'sort') ?? 'createdAt';
  if (!SORTS.includes(rawSort as ListSort)) {
    throw badRequest(`sort must be one of: ${SORTS.join(', ')}`);
  }
  const sort = rawSort as ListSort;

  const rawOrder = singleValue(query, 'order') ?? (sort === 'createdAt' ? 'desc' : 'asc');
  if (!ORDERS.includes(rawOrder as SortOrder)) {
    throw badRequest(`order must be one of: ${ORDERS.join(', ')}`);
  }

  const pageSize = parsePositiveInt(singleValue(query, 'pageSize'), 'pageSize', LIST_PAGE_SIZE);
  if (pageSize > MAX_LIST_PAGE_SIZE) {
    throw badRequest(`pageSize must be at most ${MAX_LIST_PAGE_SIZE}`);
  }

  return {
    q: rawQ.length > 0 ? rawQ : null,
    sort,
    order: rawOrder as SortOrder,
    page: parsePositiveInt(singleValue(query, 'page'), 'page', 1),
    pageSize,
  };
}

export function titleSearchFilter(q: string | null): {
  title?: { contains: string; mode: 'insensitive' };
} {
  if (q === null) {
    return {};
  }
  // Prisma passes `contains` to ILIKE unescaped, so "%" and "_" would act as wildcards.
  return { title: { contains: q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' } };
}

function compareKeys(a: ListKey, b: ListKey, sort: ListSort): number {
  const primary =
    sort === 'title'
      ? titleCollator.compare(a.title, b.title)
      : a.createdAt.getTime() - b.createdAt.getTime();
  return primary !== 0 ? primary : a.id.localeCompare(b.id);
}

/** Sorts the full key list and cuts out the requested page; the caller loads full rows for it. */
export function paginateKeys<K extends ListKey>(
  keys: K[],
  listQuery: ParsedListQuery,
): PaginatedDto<K> {
  const direction = listQuery.order === 'asc' ? 1 : -1;
  const sorted = [...keys].sort((a, b) => direction * compareKeys(a, b, listQuery.sort));
  const start = (listQuery.page - 1) * listQuery.pageSize;

  return {
    items: sorted.slice(start, start + listQuery.pageSize),
    total: keys.length,
    page: listQuery.page,
    pageSize: listQuery.pageSize,
  };
}

/**
 * For lists whose full rows are too heavy to load for every key: cuts the page out of the keys,
 * loads rows only for it and returns them in page order. `identify` must give a key and its row
 * the same value; a row deleted between the two queries is left out of the page.
 */
export async function paginateRows<K extends ListKey, T>(
  keys: K[],
  listQuery: ParsedListQuery,
  load: (pageKeys: K[]) => Promise<T[]>,
  identify: (entry: K | T) => string,
): Promise<PaginatedDto<T>> {
  const page = paginateKeys(keys, listQuery);
  const rows = await load(page.items);
  const rowById = new Map(rows.map((row) => [identify(row), row]));

  return {
    ...page,
    items: page.items.flatMap((key) => {
      const row = rowById.get(identify(key));
      return row ? [row] : [];
    }),
  };
}
