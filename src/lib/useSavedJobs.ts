import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { saveJob, savedSlugs, unsaveJob } from './api';
import { useAuth } from './authStore';

/**
 * The signed-in user's saved-job set plus a toggle. The saved slugs are fetched
 * once (keyed `['saved']`, shared across every card) and only when signed in.
 * Toggling is optimistic: the bookmark flips immediately and rolls back if the
 * request fails, then reconciles against the server. Signed out, `ready` is
 * false and the caller should route to the auth modal instead of toggling.
 */
export function useSavedJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['saved'],
    queryFn: savedSlugs,
    enabled: !!user,
    staleTime: 30_000,
  });

  const savedSet = useMemo(() => new Set(data ?? []), [data]);

  const mutation = useMutation({
    mutationFn: ({ slug, saved }: { slug: string; saved: boolean }) =>
      saved ? unsaveJob(slug) : saveJob(slug),
    onMutate: async ({ slug, saved }) => {
      await qc.cancelQueries({ queryKey: ['saved'] });
      const previous = qc.getQueryData<string[]>(['saved']) ?? [];
      qc.setQueryData<string[]>(['saved'], saved ? previous.filter((s) => s !== slug) : [...previous, slug]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(['saved'], ctx.previous); // roll back
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['saved'] }),
  });

  return {
    ready: !!user,
    isSaved: (slug: string) => savedSet.has(slug),
    toggle: (slug: string, saved: boolean) => mutation.mutate({ slug, saved }),
  };
}
