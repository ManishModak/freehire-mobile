## 1. Filter model: skills facet + exclude (TDD, framework-free)

- [x] 1.1 Write failing tests in `src/lib/jobFilters.test.ts` for the new `skillsExclude` field: `filtersToQuery` emits `skills` then `skills_exclude` (each repeated per value), positioned after the other facets and before `posted_within_days`; `activeFilterCount` adds `skillsExclude.length`.
- [x] 1.2 Write a failing test for `cycleSkill(f, skill)`: off → include → exclude → off, immutable, and mutually exclusive (a value never appears in both `facets.skills` and `skillsExclude` at once).
- [x] 1.3 Implement: add `skillsExclude: string[]` to `JobFilters` and `emptyFilters`; add `skills` to `FACET_PARAMS`; implement `cycleSkill`; update `filtersToQuery`/`activeFilterCount` until tests pass.

## 2. Filter model: `filtersFromProfile`

- [x] 2.1 Add the mobile-subset `LocationPreferences` and `UserProfile` types to `src/lib/types.ts` (specializations, skills, excluded_skills, location_preferences only).
- [x] 2.2 Write failing tests in `jobFilters.test.ts` for `filtersFromProfile`, mirroring `hire/web/src/lib/profileFilters.test.ts`'s cases adapted to mobile's facet set: seeds `category`/`skills` from specializations/skills; starts from a clean slate independent of prior staged state; trims/dedupes/drops empties; empty profile → `emptyFilters`; seeds `skillsExclude` from `excluded_skills`; a skill in both lists stays include-only; `work_mode`/`regions`/`countries` flatten from `location_preferences` including the "wantsPhysical" base-country gate (remote-only → base country NOT seeded; hybrid/onsite → seeded) and the `relocation.open` gate on relocation targets; a profile with no `location_preferences` seeds only category/skills.
- [x] 2.3 Implement `filtersFromProfile(profile: UserProfile): JobFilters` in `jobFilters.ts` until tests pass.

## 3. Profile data layer

- [x] 3.1 Add `getProfile(): Promise<UserProfile | null>` to `src/lib/api.ts`, hitting `GET /api/v1/me/profile` via the existing `send` helper (session-scoped like `me()`, not the public `getJSON` helper).
- [x] 3.2 Add `src/lib/useProfile.ts`: a `useQuery` wrapper over `getProfile()`, `enabled: !!user` (from `useAuth()`), queryKey `['profile']`.
- [x] 3.3 Clear the `['profile']` query cache on sign-out in `authStore.tsx`, matching the existing `'saved'`/`'push'` cleanup (found during code review: otherwise a second account signing in on the same device briefly sees the prior user's cached profile).

## 4. Filters screen: Skills section

- [x] 4.1 Add a "Skills" section to `src/app/filters.tsx`, placed after the static `FACETS.map(...)` loop and before "Posted within": a searchable `TextInput` + chips built from `facetCountsMap.skills` (busiest-first, capped, always showing already-selected/excluded values outside the slice) — same structure as the existing Country section.
- [x] 4.2 Extend the chip rendering to a three-state control for skills only (unselected / included [existing brand style] / excluded [muted background, strikethrough text, reusing the `#dc2626` hex already used in `account.tsx`]); tapping a skill chip calls `cycleSkill`.

## 5. Filters screen: Apply profile button

- [x] 5.1 Add `useProfile()` and `useAuth()` to `filters.tsx`; add the "Apply profile" header button (icon + label) between the title and the close button.
- [x] 5.2 Wire visibility: hidden while `useProfile()` is loading for a signed-in user, hidden if it resolves to `null`; shown otherwise (signed-out, or signed-in with a loaded non-null profile).
- [x] 5.3 Wire the tap handler: signed-out → `router.push('/auth')`; signed-in with a profile → `setStaged(filtersFromProfile(profile))` and reset the local `countryQuery`/skills-search text state.

## 6. Verify, simplify, review

- [x] 6.1 Run unit tests (`jobFilters.test.ts`); run `tsc --noEmit`; run `npm run lint`. (49/49 tests pass, tsc clean, lint clean.)
- [x] 6.2 Verify end-to-end in the iOS simulator: signed-out tap opens sign-in ✓ (confirmed live); skills chips cycle off→include→exclude→off with correct styling and live facet counts (~1.23M → 134,209 include-only → 1,094,178 with exclude → back to ~1.23M) ✓ (confirmed live); existing facets/Category/Region/Country sections still render and work ✓ (confirmed live); Clear all resets state ✓ (confirmed live). Signed-in-with-profile / signed-in-without-profile paths were not exercised against a live backend account (would require creating a production account) — covered instead by the 11 `filtersFromProfile` unit tests plus code review of `showApplyProfile`/`applyProfile()`.
- [x] 6.3 Run the `simplify` pass over the changed files, then request code review. (Per-task simplify + review done for tasks 1-5; a final whole-change holistic review confirmed no cross-task issues.)
