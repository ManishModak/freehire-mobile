## Context

The mobile feed (`src/app/(tabs)/index.tsx`) currently reads `/api/v1/jobs` via `useJobsFeed` (an infinite query) and renders `JobCard`s. There is no search or filtering. The web app derives the same feed from `/api/v1/jobs/search`, driven by a URL-synced filter model (`facetModel.ts` → query string) with a `value`/`applied` debounce split and a deferred-apply filter modal. React Native has no URL, so we port the pure model and replace the URL transport with in-memory state.

Constraints: no new runtime dependencies (no AsyncStorage, no bottom-sheet lib); reuse existing tokens, label maps, `JobCard`, and the `/jobs/[slug]` detail route. The API is public and unauthenticated.

## Goals / Non-Goals

**Goals:**
- Free-text search over the feed, debounced, via `searchJobs`.
- A full-screen Filters modal for the MVP facet set with deferred apply and a live "Show N jobs" count.
- A pure, unit-tested filter model that serializes to the exact API query string.
- No user-facing regression when no filters are active (same newest-first stream).

**Non-Goals:**
- Deferred facets (salary, language, relocation, visa, skills, role, company, source, reality, currency).
- The web's exclude / AND-OR facet modes (include-only for v1).
- Saved searches, cross-launch persistence, semantic ranking, "swipe mode".

## Decisions

- **Port the pure model, drop the URL transport.** `src/lib/jobFilters.ts` holds `JobFilters` (`{ q, facets: Record<param, string[]>, postedWithinDays: number | null }`), `filtersToQuery(filters): string` (repeated params for multi-values; `posted_within_days` when set; always `semantic_ratio=0`), `activeFilterCount(filters)`, and `toggleValue(filters, param, value)` (include → off). Framework-free and the primary TDD target. *Alternative:* reuse a filter library — rejected; the model is ~80 lines and must match the API byte-for-byte.
- **In-memory store with a value/applied split.** A React context (`FilterProvider`) holds `value` (live, drives inputs) and `applied` (debounced 300ms for `q`, immediate for discrete facet commits). The feed's `useInfiniteQuery` is keyed on the applied query string. *Alternative:* Zustand/Redux — rejected as overkill for one screen's worth of state.
- **Deferred apply via a staged copy.** The Filters modal owns a local `staged` copy seeded from the store on open; it fetches `facetCounts(stagedQuery)` (debounced ~250ms) for the "Show N jobs {total}" button and per-value counts, and calls `apply(staged)` only on tap. This matches the web and avoids thrashing the feed while picking. *Alternative:* live-apply each tap — rejected (extra feed reloads, jarring under the modal).
- **Filters screen as an expo-router modal route.** `src/app/filters.tsx` registered in the root `Stack` with `presentation: 'modal'`. Reuses the existing Stack; no navigator changes beyond one `Stack.Screen`. Reads/writes the store via context (the modal and feed share the provider mounted above both — provider goes in the root layout).
- **Facet vocabularies as static config.** Fixed vocabularies (work_mode, employment_type, seniority, regions, category, posted presets) live in a `FACETS` config in `jobFilters.ts`/`format.ts` with label maps (extending the existing maps). Country is data-driven from `facets.countries`.
- **Two query hooks.** `useJobSearch(appliedQuery)` (infinite, `searchJobs`) replaces `useJobsFeed`; `useFacetCounts(stagedQuery)` (single query, `facetCounts`) powers the modal. Both live in `src/lib/`.

## Risks / Trade-offs

- **Provider placement vs. modal.** The feed screen and the Filters modal must share filter state → the `FilterProvider` must sit above both in the root layout, not inside the feed. Mitigation: mount it in `src/app/_layout.tsx` around the `Stack`.
- **Debounce races on `q`.** Fast typing could apply a stale query. Mitigation: keep the web's pattern — input reads `value` synchronously; only `applied` is debounced; React Query dedupes/cancels by key.
- **Facet count latency.** `facetCounts` may lag behind rapid staging taps. Mitigation: debounce the count fetch and show the last known number with a subtle loading state on the button; never block selection on it.
- **Empty-filter search vs. list parity.** `searchJobs` with no params must equal the old `listJobs` order. Mitigation: verify newest-first parity in the simulator; `searchJobs` already sorts by `posted_at` by default.
- **`useJobsFeed` removal.** Swapping the data source touches the feed screen. Mitigation: keep `JobCard`, list, pagination, and pull-to-refresh intact; only the query source and header change.

## Migration Plan

1. Add `jobFilters.ts` (+ tests) and the `searchJobs`/`facetCounts` API functions — no wiring yet.
2. Add `FilterProvider` + hooks; mount the provider in the root layout.
3. Swap the feed to `useJobSearch(applied)`, add the search box + toolbar. Retire `useJobsFeed`.
4. Add the `filters.tsx` modal route + `Stack.Screen`.
5. Verify end-to-end in the simulator, then simplify and request review.

Rollback: revert the feed screen to `useJobsFeed`; the new files are additive and inert until wired.

## Open Questions

- None blocking. Country-facet UX (inline searchable list vs. its own sub-screen) can be decided during implementation; the spec only requires busiest-first, searchable options.
