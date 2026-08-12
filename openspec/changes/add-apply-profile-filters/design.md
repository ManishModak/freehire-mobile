## Context

The mobile Filters screen (`src/app/filters.tsx`, from `add-feed-search-filters`) edits a staged copy of `JobFilters` (`src/lib/jobFilters.ts`) and commits it to the feed's `FilterProvider`. That change deliberately deferred the `skills` facet and any exclude/AND-OR support to keep v1 include-only. The mobile app also has no profile data at all today: `authStore.tsx`/`api.ts` cover sign-in/sign-up/session, but nothing reads `GET /api/v1/me/profile`, which the web app already uses to power its own "Apply my profile" button (`hire/web/src/lib/facetModel.ts::filtersFromProfile`, `hire/web/src/lib/stagedFilters.svelte.ts::applyProfile`).

Constraints: no new runtime dependencies; reuse the existing staged-copy/deferred-apply pattern, the Country section's search-and-chip UI, and `constants/freehire.ts` tokens. The profile endpoint already exists server-side and needs no backend changes. Mobile has no profile-editing screen, so a signed-in user without a saved profile has nowhere to be sent — this design does not attempt to fill that gap.

## Goals / Non-Goals

**Goals:**
- A signed-in user with a saved profile can seed the entire staged filter set from it in one tap.
- The `skills` facet exists on mobile (search-and-chip, like Country) with three-state include/exclude, since a profile's `excluded_skills` needs somewhere to land.
- `filtersFromProfile()` is a pure, unit-tested function that mirrors the web's mapping (specializations → category, skills → skills [include/exclude], location preferences → work_mode/regions/countries) trimmed to the facets mobile actually has.
- No dead-end UI: the button only appears when tapping it does something (opens sign-in, or applies a real profile).

**Non-Goals:**
- A mobile profile-editing screen. Profile data stays writable from web only; mobile only reads it.
- Exclude/AND-OR support for any facet other than `skills`.
- Mapping `location_preferences.relocation`'s dedicated facet or `cities` — mobile's filter model has no such facets, so those parts of a profile are simply not represented (a narrower projection, not a bug).
- A "create a profile" nudge for signed-in users without one — deferred until mobile has somewhere to send them.

## Decisions

- **Skills gets its own exclude field instead of a generic sign-aware facet type.** `JobFilters` gains `skillsExclude: string[]` alongside the existing `facets.skills` (used as the include list); every other facet stays a plain `string[]` in `facets`. *Alternative:* generalize `facets` to carry `{include, exclude}` per param, matching the web's `FacetState` — rejected as premature: nothing else in the mobile model needs exclude, and a generic type would leave every other call site handling a shape it never uses.
- **`cycleSkill()` ports the web's three-state cycle, scoped to one field pair.** `off → include → exclude → off`, implemented directly against `facets.skills`/`skillsExclude` rather than a shared "facet state" abstraction, for the same reason as above.
- **`filtersFromProfile()` is a from-scratch build, not a merge.** Like the web, it starts from `emptyFilters` and returns a complete replacement — applying a profile discards whatever was staged before, including free-text search. *Alternative:* merge onto the current staged state — rejected; the web's own tests document clean-slate behavior explicitly, and a merge would produce filter combinations the profile never asked for.
- **The "wantsPhysical" base-country gate is ported as-is.** A profile's `base.country` only seeds `countries` when `work_modes` includes `onsite` or `hybrid` — otherwise a remote-only user's home country would wrongly narrow their search. Same for `relocation.open` gating relocation targets. Both are direct ports of the web's `facetModel.ts` logic (already covered by its own test suite), applied to mobile's narrower facet set (no `cities`, no dedicated `relocation` facet).
- **Skills UI reuses the Country section's pattern.** Searchable `TextInput` + chips from the `facets.skills` distribution (via the existing `useFacetCounts` staged query), busiest-first, capped at a fixed count, with already-selected/excluded values always shown even outside that slice. *Alternative:* a fixed-vocabulary chip list like `category` — rejected; skills is an open vocabulary, same shape as countries, not a controlled one.
- **Exclude renders as muted + strikethrough, reusing the app's one existing "destructive" color.** There's no palette token for it yet (`account.tsx` already hardcodes `#dc2626` for its error text) — the skills chip reuses that same hex rather than inventing a second ad hoc red.
- **Profile fetch is a gated React Query hook, not part of `authStore`.** `useProfile()` in a new `src/lib/useProfile.ts`, `enabled: !!user`, so it never fires for anonymous users and stays out of the auth context (which owns identity/session, not profile data). *Alternative:* fetch inside `authStore` alongside `user` — rejected; profile is optional, feature-specific data that only one screen reads, unlike `user` which many screens read.
- **Button visibility: hide, don't disable.** Signed in with `useProfile()` settled and `null` → hide the button outright, per explicit product decision (mobile has no "create a profile" destination to link a disabled/CTA state to, unlike the web). While the query is loading, also hide it, to avoid a flash of the button before it's known whether a profile exists.

## Risks / Trade-offs

- **One facet with different semantics than the rest.** `skills` supports exclude; nothing else does. Mitigation: keep the exclude machinery physically local to `skills` (a dedicated field + a dedicated cycle function) so it can't leak into or complicate the other facets' code paths.
- **Applying a profile silently discards staged edits.** A user who tweaked several filters and then taps "Apply profile" loses that staging. Mitigation: this matches the web exactly (documented, expected behavior there), and the staged copy was never committed anyway — dismissing the modal without applying still leaves the live feed untouched.
- **`useProfile()` adds a network round-trip the moment the Filters modal opens for a signed-in user.** Mitigation: React Query caches it app-wide (same `queryClient` as the feed), so it only costs a real request once per session/staleTime window, not once per modal open.
- **Skills facet distribution can be large.** Unlike countries (bounded to ~200 ISO codes), skills is a free-form vocabulary that could return a long tail. Mitigation: reuse the same cap-and-search pattern already proven for Country (`MAX_COUNTRIES`-style constant), with selected/excluded values pinned visible regardless of rank.

## Migration Plan

1. Add `UserProfile`/`LocationPreferences` types, `getProfile()`, and `useProfile()` — additive, unwired.
2. Extend `jobFilters.ts`: `skillsExclude` field, `cycleSkill()`, `skills`/`skills_exclude` in `filtersToQuery`, `activeFilterCount`, and `filtersFromProfile()` — plus their unit tests (TDD).
3. Add the Skills section to `filters.tsx` (search + three-state chips), wired the same way as the existing Country section.
4. Add the header "Apply profile" button and its three states (signed-out / has-profile / hidden).
5. Verify end-to-end in the iOS simulator (signed-out tap, signed-in-with-profile tap, signed-in-without-profile hidden state, skills include/exclude cycling, serialized query), then simplify and request review.

Rollback: every new file/field is additive; the button and Skills section are new UI blocks that can be removed without touching the existing facets, store, or feed.

## Open Questions

- None blocking. The exact cap on the Skills section's visible chip count (mirroring `MAX_COUNTRIES`) is an implementation detail, not a spec requirement.
