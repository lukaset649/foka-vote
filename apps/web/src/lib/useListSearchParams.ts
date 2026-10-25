import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { ListQuery } from '@foka-vote/shared';

export type ListSortOption = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc';

export const LIST_SORT_OPTIONS: readonly ListSortOption[] = [
  'newest',
  'oldest',
  'titleAsc',
  'titleDesc',
];

const SEARCH_DEBOUNCE_MS = 300;

function sortOptionFrom(sort: string | null, order: string | null): ListSortOption {
  if (sort === 'title') {
    return order === 'desc' ? 'titleDesc' : 'titleAsc';
  }
  return order === 'asc' ? 'oldest' : 'newest';
}

function parsePage(value: string | null): number {
  return value !== null && /^\d+$/.test(value) && Number(value) >= 1 ? Number(value) : 1;
}

/**
 * Keeps a server-side list's search, sort and page in the URL so reloads and the back button
 * restore it. Default values are left out of the URL; any change other than the page resets it to 1.
 */
export function useListSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQ = searchParams.get('q')?.trim() ?? '';
  const sortOption = sortOptionFrom(searchParams.get('sort'), searchParams.get('order'));
  const page = parsePage(searchParams.get('page'));

  const [searchInput, setSearchInput] = useState(urlQ);
  const [syncedUrlQ, setSyncedUrlQ] = useState(urlQ);

  // Follows URL changes made elsewhere (back button, links) without trimming what is being typed.
  if (urlQ !== syncedUrlQ) {
    setSyncedUrlQ(urlQ);
    if (searchInput.trim() !== urlQ) {
      setSearchInput(urlQ);
    }
  }

  const update = useCallback(
    (changes: Record<string, string | null>, replace: boolean) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [name, value] of Object.entries(changes)) {
            if (value === null) {
              next.delete(name);
            } else {
              next.set(name, value);
            }
          }
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === urlQ) {
      return;
    }
    const timeout = window.setTimeout(() => {
      update({ q: trimmed.length > 0 ? trimmed : null, page: null }, true);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput, urlQ, update]);

  const setSortOption = useCallback(
    (option: ListSortOption) => {
      update(
        {
          sort: option === 'titleAsc' || option === 'titleDesc' ? 'title' : null,
          order: option === 'oldest' ? 'asc' : option === 'titleDesc' ? 'desc' : null,
          page: null,
        },
        false,
      );
    },
    [update],
  );

  const setPage = useCallback(
    (nextPage: number, replace = false) => {
      update({ page: nextPage > 1 ? String(nextPage) : null }, replace);
      window.scrollTo({ top: 0 });
    },
    [update],
  );

  const query = useMemo<ListQuery>(
    () => ({
      ...(urlQ.length > 0 && { q: urlQ }),
      sort: sortOption === 'titleAsc' || sortOption === 'titleDesc' ? 'title' : 'createdAt',
      order: sortOption === 'newest' || sortOption === 'titleDesc' ? 'desc' : 'asc',
      page,
    }),
    [urlQ, sortOption, page],
  );

  return { query, searchInput, setSearchInput, sortOption, setSortOption, setPage };
}

/** Moves a page left behind by a shrinking list (or typed into the URL) to the last one. */
export function useClampedPage(
  page: number | undefined,
  totalPages: number,
  setPage: (page: number, replace?: boolean) => void,
): void {
  useEffect(() => {
    if (totalPages > 0 && page !== undefined && page > totalPages) {
      setPage(totalPages, true);
    }
  }, [page, totalPages, setPage]);
}
