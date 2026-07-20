import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { facetCounts, searchJobs } from './api';

const PAGE_SIZE = 20;

/**
 * The filtered/searched feed as an infinite query, keyed on the applied filter
 * query string — changing filters or the search text swaps the cache entry, so
 * results reset cleanly. An empty `appliedQuery` returns the plain newest-first
 * stream, so this fully replaces the old `useJobsFeed`. Pagination walks
 * `offset` forward until we pass `meta.total`.
 */
export function useJobSearch(appliedQuery: string) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'search', appliedQuery],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchJobs(appliedQuery, PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.meta.offset + lastPage.data.length;
      return loaded < lastPage.meta.total ? loaded : undefined;
    },
  });
}

/**
 * Live facet counts for the Filters screen: the matching `total` behind "Show N
 * jobs" and the per-value distributions (e.g. countries busiest-first). Keyed on
 * the staged query so it refetches as selections change; `keepPreviousData`
 * keeps the last count on screen during the refetch instead of flashing empty.
 */
export function useFacetCounts(stagedQuery: string) {
  return useQuery({
    queryKey: ['facets', stagedQuery],
    queryFn: () => facetCounts(stagedQuery),
    placeholderData: (prev) => prev,
  });
}

export { PAGE_SIZE };
