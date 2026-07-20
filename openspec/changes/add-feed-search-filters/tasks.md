## 1. Filter model (TDD, framework-free)

- [x] 1.1 Add a test runner if none exists (check package.json; wire `jest-expo` + a `test` script only if needed for unit tests).
- [x] 1.2 Write failing tests for `src/lib/jobFilters.ts`: `filtersToQuery` encodes `q`, repeated multi-values (`work_mode=remote&work_mode=hybrid`), `posted_within_days` when set and omitted when null, and always appends `semantic_ratio=0`; `activeFilterCount` sums selected facet values (posted-within counts as one when set); `toggleValue` cycles include → off and is immutable.
- [x] 1.3 Implement `jobFilters.ts` (`JobFilters` type, `emptyFilters`, `FACETS` config with param + vocabulary, `filtersToQuery`, `activeFilterCount`, `toggleValue`, `setPostedWithin`, `setQuery`) until tests pass.
- [x] 1.4 Add label maps for the new facet vocabularies (work_mode/employment_type/seniority/regions/category/posted presets) reusing/extending `src/lib/format.ts`.

## 2. API layer

- [x] 2.1 Add `searchJobs(query: string, limit, offset): Promise<Page<Job>>` to `src/lib/api.ts` hitting `/api/v1/jobs/search?<query>&limit&offset`.
- [x] 2.2 Add `facetCounts(query: string): Promise<FacetCounts>` hitting `/api/v1/jobs/facets?<query>&disjunctive=1`; add the `FacetCounts` type (`{ total, facets, stats }`) to `src/lib/types.ts`.

## 3. Filter store + query hooks

- [x] 3.1 Add `FilterProvider` + `useFilters()` context in `src/lib/filterStore.tsx`: holds `value` and debounced `applied` (300ms for `q`, immediate for facet commits), exposes `setQuery`, `apply(staged)`, `clear`, and the applied query string.
- [x] 3.2 Mount `FilterProvider` in `src/app/_layout.tsx` around the root `Stack` (so the feed and the Filters modal share it).
- [x] 3.3 Add `useJobSearch(appliedQuery)` (infinite query over `searchJobs`, page size 20, `getNextPageParam` from `meta.total`) replacing `useJobsFeed`; add `useFacetCounts(stagedQuery)` (single query over `facetCounts`).

## 4. Feed screen

- [x] 4.1 Swap `src/app/(tabs)/index.tsx` from `useJobsFeed` to `useJobSearch(applied)`; keep the FlashList, pagination, pull-to-refresh, and JobCard navigation.
- [x] 4.2 Add a debounced search `TextInput` bound to `setQuery` (input shows `value.q` immediately).
- [x] 4.3 Add a toolbar row: total result count (from `meta.total`) + a Filters button badged with `activeFilterCount` (badge hidden at 0) that routes to `/filters`.
- [x] 4.4 Delete `src/lib/useJobsFeed.ts` once the feed no longer imports it.

## 5. Filters modal screen

- [x] 5.1 Create `src/app/filters.tsx` and register `Stack.Screen name="filters"` with `presentation: 'modal'` in `_layout.tsx`.
- [x] 5.2 Seed a local `staged` copy from the store on open; render pill sections for work_mode, employment_type, seniority, regions, category, and a segmented posted-within control.
- [x] 5.3 Add a searchable country list driven by `facets.countries` (busiest-first) from `useFacetCounts(stagedQuery)`.
- [x] 5.4 Wire `useFacetCounts(stagedQuery)` (debounced) to the sticky footer: primary button reads "Show {total} jobs" and calls `apply(staged)` then `router.back()`; "Clear all" resets `staged`.

## 6. Verify, simplify, review

- [x] 6.1 Run unit tests; run `tsc --noEmit`.
- [x] 6.2 Verify end-to-end in the iOS simulator: typing narrows the feed; selecting facets updates the live count and, on apply, the results; badge and clear-all behave; tapping a result still opens `/jobs/[slug]`.
- [x] 6.3 Run the `simplify` pass over the changed files, then request code review.
