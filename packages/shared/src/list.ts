export type ListSort = 'createdAt' | 'title';

export type SortOrder = 'asc' | 'desc';

export interface ListQuery {
  q?: string;
  sort?: ListSort;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface PaginatedDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
