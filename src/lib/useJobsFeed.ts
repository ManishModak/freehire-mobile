import { useInfiniteQuery } from '@tanstack/react-query';

import { listJobs } from './api';

const PAGE_SIZE = 20;

/**
 * The global jobs feed as an infinite query. Each page is `PAGE_SIZE` jobs; the
 * next page's `offset` is simply how many we've loaded so far. `getNextPageParam`
 * returns undefined once we've walked past `meta.total`, which is how the list
 * knows to stop asking. The screen flattens `data.pages` into one job array.
 */
export function useJobsFeed() {
  return useInfiniteQuery({
    queryKey: ['jobs', 'feed'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listJobs(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.meta.offset + lastPage.data.length;
      return loaded < lastPage.meta.total ? loaded : undefined;
    },
  });
}

export { PAGE_SIZE };
