## ADDED Requirements

### Requirement: Skills facet with include/exclude
The Filters screen SHALL support a `skills` facet, presented as a searchable, data-driven list (like the country facet) whose options and counts come from the `facets.skills` distribution. Unlike every other facet, `skills` SHALL be three-state per value: off, include, or exclude, cycling in that order on each tap. Include values SHALL serialize to the `skills` query parameter and exclude values to `skills_exclude`, each repeated once per value.

#### Scenario: Cycling a skill through its three states
- **WHEN** the user taps an unselected skill chip
- **THEN** it becomes included
- **WHEN** the user taps it again
- **THEN** it becomes excluded
- **WHEN** the user taps it a third time
- **THEN** it returns to unselected

#### Scenario: Included and excluded skills serialize to separate parameters
- **WHEN** the staged filters include `go` and exclude `php`
- **THEN** the request includes `skills=go&skills_exclude=php`

#### Scenario: Excluded skills render distinctly
- **WHEN** a skill is excluded
- **THEN** its chip renders in a muted, strikethrough style distinct from an included chip

### Requirement: Apply profile — signed out
The Filters screen header SHALL show an "Apply profile" button. When the user is not signed in, tapping it SHALL open the sign-in modal instead of changing any filters.

#### Scenario: Signed-out tap opens sign-in
- **WHEN** a signed-out user taps "Apply profile"
- **THEN** the sign-in modal opens
- **AND** the staged filters are unchanged

### Requirement: Apply profile — seeds filters from the saved profile
When the user is signed in and has a saved profile, tapping "Apply profile" SHALL replace the entire staged filter set with one seeded from that profile: `category` from `specializations`; `skills` (include) from `skills` and `skills` (exclude) from `excluded_skills`, with a skill present in both kept as include-only; `work_mode` from `location_preferences.work_modes`; `regions` from the union of the remote region reach and (only if open to relocating) the relocation regions; `countries` from the union of the remote country reach, the relocation countries (only if open to relocating), and the profile's base country (only if `work_modes` includes `onsite` or `hybrid`). Facets the mobile filter model has no equivalent for (cities, a dedicated relocation facet) are not seeded. The replacement SHALL discard whatever was staged before, including the free-text search query.

#### Scenario: Applying a profile replaces staged filters
- **WHEN** a signed-in user with a saved profile has staged filters and taps "Apply profile"
- **THEN** the staged filters become exactly the profile-derived set
- **AND** any previously staged selections not derived from the profile are gone

#### Scenario: A remote-only user's base country is not seeded
- **WHEN** the profile's `location_preferences.work_modes` is `["remote"]` and `base.country` is set
- **THEN** the seeded `countries` facet does not include the base country

#### Scenario: A hybrid user's base country is seeded
- **WHEN** the profile's `location_preferences.work_modes` includes `hybrid` and `base.country` is set
- **THEN** the seeded `countries` facet includes the base country

#### Scenario: Relocation targets only count when open to relocating
- **WHEN** `location_preferences.relocation.open` is `false` but `relocation.countries` is non-empty
- **THEN** the seeded `regions`/`countries` facets do not include the relocation targets

#### Scenario: A wanted skill overrides an overlapping excluded skill
- **WHEN** a profile lists a skill in both `skills` and `excluded_skills`
- **THEN** the seeded `skills` facet includes it and does not exclude it

#### Scenario: Committing still requires the explicit apply action
- **WHEN** the user taps "Apply profile" and then dismisses the Filters screen without tapping "Show N jobs"
- **THEN** the live feed's filters are unchanged

### Requirement: Apply profile — hidden without a saved profile
When the user is signed in but has no saved profile (or the profile is still loading), the "Apply profile" button SHALL be hidden entirely rather than shown disabled or as a prompt.

#### Scenario: No profile yet
- **WHEN** a signed-in user with no saved profile opens the Filters screen
- **THEN** no "Apply profile" button is shown

#### Scenario: Profile still loading
- **WHEN** a signed-in user opens the Filters screen and the profile fetch has not yet resolved
- **THEN** no "Apply profile" button is shown until it resolves
