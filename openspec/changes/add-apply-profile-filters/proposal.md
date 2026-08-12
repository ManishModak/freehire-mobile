## Why

The web app (freehire.dev) lets a signed-in user with a saved profile seed the job filters from that profile in one tap ("Apply my profile"): their specializations, skills, and location preferences become filter selections instead of being picked by hand. The mobile Filters screen (`src/app/filters.tsx`, from `add-feed-search-filters`) has no equivalent — every filter must be set manually, even for a user who already told the app what they're looking for on the web.

## What Changes

- Add a **profile data layer** to the mobile app, which currently has authentication but no profile plumbing at all: a `UserProfile` type, a `getProfile()` API call against the existing `GET /api/v1/me/profile` endpoint, and a `useProfile()` query hook gated on being signed in.
- Add an **"Apply profile" button** to the Filters screen header. Signed out, it opens the existing sign-in modal. Signed in with a saved profile, it replaces the entire staged filter set with one seeded from the profile (specializations → category, skills → skills, location preferences → work mode/region/country). Signed in with no saved profile yet, the button is hidden (mobile has no profile-editing screen to send the user to).
- Add a **`skills` facet** to the filter model and Filters screen — deferred by the original filters change, and required to seed skills from a profile. Skills is the one facet that supports include/exclude (a profile can name skills to avoid); every other mobile facet stays include-only.
- Extend the filter model (`src/lib/jobFilters.ts`) with the exclude-aware `skills` field and a pure `filtersFromProfile()` seeding function (a port of the web's `facetModel.ts::filtersFromProfile`, trimmed to the facets the mobile model actually has).

Deferred (not in this change): a profile-editing screen on mobile (profile data stays web-only for now); the AND-OR facet mode; exclude support for any facet other than skills; a "create a profile" prompt for signed-in users without one.

## Capabilities

### New Capabilities
- `profile-apply-filters`: fetch the signed-in user's saved profile and seed the job filters from it via a header button on the Filters screen, including the skills facet's include/exclude selection.

### Modified Capabilities
<!-- None — job-feed-filters from add-feed-search-filters has not been synced into openspec/specs/ yet, so there is no existing spec to add a delta against. -->

## Impact

- **Screens:** `src/app/filters.tsx` gains a header "Apply profile" button and a new Skills section (searchable, chip-based, three-state include/exclude — same pattern as the existing Country section).
- **Data/model:** `src/lib/jobFilters.ts` gains a `skillsExclude` field, a `cycleSkill()` helper, and `filtersFromProfile()`; `src/lib/types.ts` gains `UserProfile`/`LocationPreferences`; `src/lib/api.ts` gains `getProfile()`; new `src/lib/useProfile.ts` hook.
- **API:** reads `GET /api/v1/me/profile` (already exists, used by web only today) and adds `skills`/`skills_exclude` to the existing `GET /api/v1/jobs/search` and `GET /api/v1/jobs/facets` query strings — no server changes.
- **Reuse:** `useAuth()`/`/auth` modal for the signed-out path, the Country section's search-and-chip pattern for the new Skills section, `constants/freehire.ts` tokens.
- **Tests:** unit tests for `filtersFromProfile`, `cycleSkill`, and the extended `filtersToQuery`/`activeFilterCount` in `src/lib/jobFilters.test.ts`.
