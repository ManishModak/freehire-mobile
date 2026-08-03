/**
 * The only module that knows the API base URL and wire shapes. Screens call the
 * typed functions here; they never touch fetch or URLs directly. Mirrors the
 * web client's contract (see hire/web/src/lib/api.ts) against the same public
 * endpoints, so the mobile feed and the website read identical data.
 */

import type { FacetCounts, Job, Page, User, UserJob } from './types';

/** Production API. Public, unauthenticated reads — no key needed for the feed. */
export const API_BASE = 'https://freehire.dev';

/**
 * A failed API call, carrying the HTTP status and the server's `{"error": …}`
 * message so callers (and `authMessage`) can turn it into friendly copy. The
 * session rides the native cookie jar — React Native's fetch stores the
 * `hire_token` cookie from login and re-sends it automatically, so no request
 * here attaches auth explicitly.
 */
export class ApiError extends Error {
  status: number;
  serverError?: string;
  constructor(status: number, serverError?: string) {
    super(serverError ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.serverError = serverError;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`freehire API ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

/** Send a JSON request that participates in auth (cookie ride-along), throwing
 *  an `ApiError` with the server message on failure. Returns undefined for 204. */
async function send<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    let serverError: string | undefined;
    try {
      serverError = (await res.json())?.error;
    } catch {
      // non-JSON error body — fall back to the status alone
    }
    throw new ApiError(res.status, serverError);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth -------------------------------------------------------------------

/** Turn an auth failure into user-facing copy: prefer the server's own message
 *  (capitalized), else a status-based fallback. Pure — unit-tested. */
export function authMessage(status: number, serverError?: string): string {
  const msg = serverError?.trim();
  if (msg) return msg.charAt(0).toUpperCase() + msg.slice(1);
  switch (status) {
    case 400:
      return 'Please check your email and password.';
    case 401:
      return 'Invalid email or password.';
    case 409:
      return 'That email is already registered.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const jsonBody = (email: string, password: string) => JSON.stringify({ email, password });

/** Create an account and start a session (the response sets the auth cookie). */
export async function register(email: string, password: string): Promise<User> {
  const { data } = await send<{ data: User }>('/api/v1/auth/register', {
    method: 'POST',
    body: jsonBody(email, password),
  });
  return data;
}

/** Verify credentials and start a session. */
export async function login(email: string, password: string): Promise<User> {
  const { data } = await send<{ data: User }>('/api/v1/auth/login', {
    method: 'POST',
    body: jsonBody(email, password),
  });
  return data;
}

/** Clear the session cookie server-side. Idempotent. */
export async function logout(): Promise<void> {
  await send<void>('/api/v1/auth/logout', { method: 'POST' });
}

/** The current user, or throws `ApiError(401)` when signed out. */
export async function me(): Promise<User> {
  const { data } = await send<{ data: User }>('/api/v1/auth/me', { method: 'GET' });
  return data;
}

// --- OAuth (social sign-in) -------------------------------------------------

/** The provider flow's entry URL, tagged `platform=mobile` so the backend
 *  finishes by redirecting to our custom scheme with a one-time code instead of
 *  setting a cookie + web redirect. */
export function oauthStartUrl(provider: string): string {
  return `${API_BASE}/api/v1/auth/oauth/${provider}/start?platform=mobile`;
}

/** The providers the backend has configured (e.g. github/google/linkedin).
 *  Public; callers treat a failure as "no providers". */
export async function oauthProviders(): Promise<string[]> {
  const { data } = await send<{ data: string[] }>('/api/v1/auth/oauth/providers', { method: 'GET' });
  return data ?? [];
}

/** Exchange the one-time code from the OAuth callback deep link for a session.
 *  The response sets the `hire_token` cookie — and because THIS app makes the
 *  request, that cookie lands in the app's jar (unlike the browser flow's). A
 *  bad/expired/used code is a 401 `ApiError`. */
export async function exchangeOAuth(code: string): Promise<User> {
  const { data } = await send<{ data: User }>('/api/v1/auth/oauth/exchange', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return data;
}

// --- Saved jobs (session-scoped) --------------------------------------------

/** Mark a job saved (bookmark). Returns the updated interaction. */
export async function saveJob(slug: string): Promise<UserJob> {
  const { data } = await send<{ data: UserJob }>(`/api/v1/jobs/${slug}/save`, { method: 'POST' });
  return data;
}

/** Clear a job's saved mark. Idempotent. */
export async function unsaveJob(slug: string): Promise<UserJob> {
  const { data } = await send<{ data: UserJob }>(`/api/v1/jobs/${slug}/save`, { method: 'DELETE' });
  return data;
}

/** The slugs of every job the signed-in user has saved. */
export async function savedSlugs(): Promise<string[]> {
  const { data } = await send<{ data: string[] }>('/api/v1/me/tracking/saved', { method: 'GET' });
  return data ?? [];
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
