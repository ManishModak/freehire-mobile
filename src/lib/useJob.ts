import { useQuery } from '@tanstack/react-query';

import { getJob } from './api';

/**
 * A single job by slug for the detail screen. Keyed on the slug so navigating
 * between jobs caches each independently and back-navigation is instant. Disabled
 * until a slug is present (the route param can be momentarily undefined on mount).
 */
export function useJob(slug: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', slug],
    queryFn: () => getJob(slug as string),
    enabled: !!slug,
  });
}
