/**
 * The feed's filter model — a framework-free port of the web app's facetModel.
 * It owns the filter SHAPE and how it serializes to the API's query string; it
 * knows nothing about React, navigation, or the network. The feed and the
 * Filters screen both build on it, and `filtersToQuery` output is fed verbatim
 * to `/api/v1/jobs/search` and `/api/v1/jobs/facets` (each appends its own
 * constants — `semantic_ratio`/`limit`/`offset`, or `disjunctive`).
 *
 * v1 is include-only: a facet holds a flat list of selected value codes (no
 * exclude / AND-OR modes the web supports). Serialization repeats the param once
 * per value (`work_mode=remote&work_mode=hybrid`), which the API reads as OR.
 */

export type JobFilters = {
  q: string;
  facets: Record<string, string[]>; // param -> selected value codes
  postedWithinDays: number | null; // maps to posted_within_days; null = Any
};

export const emptyFilters: JobFilters = { q: '', facets: {}, postedWithinDays: null };

/** A filterable facet group with a fixed vocabulary (countries are dynamic and
 *  handled separately — see the Filters screen). Order here is also the order
 *  facets appear in the serialized query and on screen. */
export type FacetDef = { param: string; label: string; values: string[] };

export const FACETS: FacetDef[] = [
  { param: 'work_mode', label: 'Work format', values: ['remote', 'hybrid', 'onsite'] },
  {
    param: 'employment_type',
    label: 'Employment',
    values: ['full_time', 'part_time', 'contract', 'internship'],
  },
  {
    param: 'seniority',
    label: 'Seniority',
    values: ['intern', 'junior', 'middle', 'senior', 'lead', 'staff', 'principal', 'c_level'],
  },
  {
    param: 'regions',
    label: 'Region',
    values: ['global', 'north_america', 'latam', 'eu', 'uk', 'mena', 'africa', 'apac', 'cis'],
  },
  {
    param: 'category',
    label: 'Category',
    values: [
      'backend', 'frontend', 'fullstack', 'mobile', 'devops', 'sre', 'network_engineering',
      'data_engineering', 'data_science', 'data_analytics', 'ml_ai', 'ai_engineering', 'qa',
      'security', 'hardware', 'embedded', 'blockchain', 'architecture', 'design', 'product',
      'project_management', 'management', 'marketing', 'sales', 'support', 'other',
    ],
  },
];

/** The presets behind the posted-within control (single choice; Any = null). */
export const POSTED_WITHIN: { days: number | null; label: string }[] = [
  { days: 1, label: 'Today' },
  { days: 3, label: '3 days' },
  { days: 7, label: 'Week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: 'Month' },
  { days: 90, label: '3 months' },
  { days: null, label: 'Any' },
];

/** Facet params in serialization order. `countries` has no static vocabulary
 *  (its options come from the live facet distribution) but still serializes. */
const FACET_PARAMS = [
  'work_mode',
  'employment_type',
  'seniority',
  'regions',
  'countries',
  'category',
];

/**
 * Serialize the filter state to a query string: `q` first, then each facet's
 * values (repeated), then `posted_within_days`. Absent/empty parts are skipped,
 * so the empty filter set is the empty string. Deterministic order keeps it
 * stable as a React Query cache key.
 */
export function filtersToQuery(f: JobFilters): string {
  const p = new URLSearchParams();
  const q = f.q.trim();
  if (q) p.append('q', q);
  for (const param of FACET_PARAMS) {
    for (const value of f.facets[param] ?? []) p.append(param, value);
  }
  if (f.postedWithinDays != null) p.append('posted_within_days', String(f.postedWithinDays));
  return p.toString();
}

/** The number badged on the Filters button: every selected facet value plus the
 *  posted-within choice. The free-text query is search, not a filter, so it does
 *  not count. */
export function activeFilterCount(f: JobFilters): number {
  let n = 0;
  for (const values of Object.values(f.facets)) n += values.length;
  if (f.postedWithinDays != null) n += 1;
  return n;
}

/** Toggle one value in a facet: off -> selected -> off. Immutable. */
export function toggleValue(f: JobFilters, param: string, value: string): JobFilters {
  const current = f.facets[param] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const facets = { ...f.facets };
  if (next.length) facets[param] = next;
  else delete facets[param];
  return { ...f, facets };
}

/** Set the posted-within choice (null clears it). Immutable. */
export function setPostedWithin(f: JobFilters, days: number | null): JobFilters {
  return { ...f, postedWithinDays: days };
}

/** Replace the free-text query. Immutable. */
export function setQuery(f: JobFilters, q: string): JobFilters {
  return { ...f, q };
}
