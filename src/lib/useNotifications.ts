import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getNotification, getNotifications } from './api';
import { useAuth } from './authStore';

const PAGE_SIZE = 20;

/**
 * The bell icon's badge count. A 1-row page is enough — only
 * `meta.unread_count` is read, so this is as cheap as the list endpoint
 * itself gets. Disabled when signed out (there is nothing to badge).
 */
export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => (await getNotifications(1, 0)).meta.unread_count,
    enabled: !!user,
  });
}

/**
 * The notification-center screen's paginated list, newest first. Pagination
 * walks `offset` forward until we pass `meta.total`, same shape as
 * `useJobSearch`.
 */
export function useNotifications() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getNotifications(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.meta.offset + lastPage.data.length;
      return loaded < lastPage.meta.total ? loaded : undefined;
    },
    enabled: !!user,
  });
}

/**
 * A single notification by id — the digest jobs-list screen's own read,
 * needed because getNotifications alone only ever serves whichever page the
 * list screen last loaded. Keyed on id so navigating between notifications
 * (or back to one) caches each independently, mirroring `useJob`.
 */
export function useNotification(id: number | undefined) {
  return useQuery({
    queryKey: ['notifications', 'detail', id],
    queryFn: () => getNotification(id as number),
    enabled: id != null,
  });
}
