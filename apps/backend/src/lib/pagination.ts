import type { PaginatedResponse } from '@api-perf/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@api-perf/shared';

export interface PaginationQuery {
  page?: string;
  pageSize?: string;
}

export function parsePagination(query: PaginationQuery): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.pageSize ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasNextPage: page * pageSize < total,
  };
}
