import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { emptyFilters, filtersToQuery, setQuery as setQueryOn, type JobFilters } from './jobFilters';

/**
 * The feed's filter state, shared by the feed screen and the Filters modal (both
 * mount under the provider in the root layout). React Native has no URL, so this
 * replaces the web's URL-synced store with in-memory state — but keeps the same
 * `value`/`applied` split: `filters` (live) drives the search input immediately,
 * while `appliedQuery` (the debounced serialization) drives the actual feed
 * request. Typing `q` is continuous (debounced 300ms); facet changes are
 * discrete and commit at once via `apply`.
 */

const DEBOUNCE_MS = 300;

type FilterContextValue = {
  /** Live filters — seed the Filters modal and badge from this. */
  filters: JobFilters;
  /** Serialized applied filters — the feed's query key + request string. */
  appliedQuery: string;
  /** Update the free-text query (immediate on input, debounced into applied). */
  setQuery: (q: string) => void;
  /** Commit a full filter set (from the Filters modal's "Show N jobs"). */
  apply: (next: JobFilters) => void;
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<JobFilters>(emptyFilters);
  const [applied, setApplied] = useState<JobFilters>(emptyFilters);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending debounce if the provider unmounts.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const setQuery = useCallback((q: string) => {
    setValue((v) => setQueryOn(v, q)); // input reflects it immediately
    if (timer.current) clearTimeout(timer.current);
    // Only q is debounced; merge it onto the current applied set (whose facets
    // are already in sync, since facets only change through `apply`).
    timer.current = setTimeout(() => setApplied((a) => setQueryOn(a, q)), DEBOUNCE_MS);
  }, []);

  const apply = useCallback((next: JobFilters) => {
    if (timer.current) clearTimeout(timer.current); // an explicit apply wins over a pending debounce
    setValue(next);
    setApplied(next);
  }, []);

  const appliedQuery = useMemo(() => filtersToQuery(applied), [applied]);

  const ctx = useMemo<FilterContextValue>(
    () => ({ filters: value, appliedQuery, setQuery, apply }),
    [value, appliedQuery, setQuery, apply],
  );

  return <FilterContext.Provider value={ctx}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within a FilterProvider');
  return ctx;
}
