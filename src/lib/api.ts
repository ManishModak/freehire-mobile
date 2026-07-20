/**
 * The only module that knows the API base URL and wire shapes. Screens call the
 * typed functions here; they never touch fetch or URLs directly. Mirrors the
 * web client's contract (see hire/web/src/lib/api.ts) against the same public
 * endpoints, so the mobile feed and the website read identical data.
 */

import type { Job, Page } from './types';

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
 * One page of the global jobs feed, newest first. `offset` drives pagination —
 * callers add `limit` each time to walk forward. Returns the full `Page` so the
 * caller can read `meta.total` (there are millions) and know when to stop.
 */
export function listJobs(limit: number, offset: number): Promise<Page<Job>> {
  return getJSON<Page<Job>>(`/api/v1/jobs?limit=${limit}&offset=${offset}`);
}
