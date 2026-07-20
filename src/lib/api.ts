/**
 * The only module that knows the API base URL and wire shapes. Screens call the
 * typed functions here; they never touch fetch or URLs directly. Mirrors the
 * web client's contract (see hire/web/src/lib/api.ts) against the same public
 * endpoints, so the mobile feed and the website read identical data.
 */

import type { FacetCounts, Job, Page } from './types';

/** Production API. Public, unauthenticated reads — no key needed for the feed. */
export const API_BASE = 'https://freehire.dev';

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`freehire API ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * The filtered/searched feed. Takes the serialized filter query (from
 * `filtersToQuery`) and appends the request constants: `semantic_ratio=0`
 * (keyword ranking, matching the web) plus pagination. An empty `query` yields
 * the plain newest-first stream, so this cleanly replaces the old `listJobs`.
 */
export function searchJobs(query: string, limit: number, offset: number): Promise<Page<Job>> {
  const params = new URLSearchParams(query);
  params.set('semantic_ratio', '0');
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return getJSON<Page<Job>>(`/api/v1/jobs/search?${params.toString()}`);
}

/**
 * Per-value facet counts for the same filter query, used by the Filters screen's
 * live "Show N jobs" total and its data-driven country list. `disjunctive=1`
 * makes each facet's counts ignore its own selection, so sibling values still
 * show counts. Missing sections are normalized to `{}`.
 */
export async function facetCounts(query: string): Promise<FacetCounts> {
  const params = new URLSearchParams(query);
  params.set('disjunctive', '1');
  const { data } = await getJSON<{ data: FacetCounts }>(`/api/v1/jobs/facets?${params.toString()}`);
  return { total: data.total ?? 0, facets: data.facets ?? {}, stats: data.stats ?? {} };
}

/**
 * One job by its public slug, for the detail screen. This read returns the FULL
 * job model (unlike the feed's subset): `reality` as an object, `view_count`,
 * `closed_at`, and the extended enrichment facets. The endpoint wraps the record
 * in a `{ data }` envelope, so we unwrap it here and hand the screen a plain Job.
 */
export async function getJob(slug: string): Promise<Job> {
  const { data } = await getJSON<{ data: Job }>(`/api/v1/jobs/${slug}`);
  return data;
}
