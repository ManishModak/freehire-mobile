## Why

The mobile feed is a flat, unfiltered stream of every job, newest-first — there is no way to search by keyword or narrow by work mode, seniority, region, etc. The web app (freehire.me) turns the same feed into a searchable, faceted experience; the mobile app should reach parity for the highest-value filters, in a mobile-native form.

## What Changes

- Add a **free-text search** box to the feed. Typing narrows results (debounced), backed by the server search endpoint instead of the plain list endpoint.
- Add a **Filters screen** (a full-screen modal route) covering the MVP facet set: work mode, employment type, seniority, region, country, category, and "posted within". Each facet is multi-select (include-only for v1).
- Add a **filter toolbar** to the feed: total result count plus a Filters button badged with the active-filter count.
- Adopt the web's **deferred-apply** pattern on the Filters screen: edits stage locally, a live matching count is fetched as you pick, and selections commit only when you tap **Show N jobs**.
- **BREAKING (internal):** the feed switches from `listJobs` (`/api/v1/jobs`) to `searchJobs` (`/api/v1/jobs/search`); `useJobsFeed` is replaced by a filter-aware query. No user-facing regression — an empty filter set returns the same newest-first stream.

Deferred (not in this change): salary, language, relocation, visa, skills, role, company, source, reality, currency facets; the exclude / AND-OR facet modes; saved searches; persistence across launches.

## Capabilities

### New Capabilities
- `job-feed-search`: free-text keyword search over the jobs feed, debounced, driving the server search endpoint and pagination.
- `job-feed-filters`: multi-select faceted filtering of the feed (work mode, employment type, seniority, region, country, category, posted-within) via a dedicated Filters screen with a live count and deferred apply.

### Modified Capabilities
<!-- None — there are no existing specs in openspec/specs/. -->

## Impact

- **Screens:** `src/app/(tabs)/index.tsx` (feed gains search box + toolbar; swaps data source); new `src/app/filters.tsx` (modal route) and its registration in the root `Stack` (`src/app/_layout.tsx`).
- **Data/model:** new pure `src/lib/jobFilters.ts` (filter model + query serialization + active count); `src/lib/api.ts` gains `searchJobs` and `facetCounts`; new filter store/context and query hooks replacing `src/lib/useJobsFeed.ts`.
- **API:** reads `GET /api/v1/jobs/search` and `GET /api/v1/jobs/facets` (public, unauthenticated) — no server changes.
- **Reuse:** existing design tokens (`constants/freehire.ts`), label maps (`lib/format.ts`), `JobCard`, and the job-detail route (`/jobs/[slug]`).
- **Tests:** unit tests for `jobFilters`; end-to-end verification in the iOS simulator.
