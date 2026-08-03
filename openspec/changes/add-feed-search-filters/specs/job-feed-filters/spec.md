## ADDED Requirements

### Requirement: MVP facet set
The feed SHALL support filtering by these facets, each mapped to its API query parameter: work mode (`work_mode`), employment type (`employment_type`), seniority (`seniority`), region (`regions`), country (`countries`), category (`category`), and posted-within (`posted_within_days`). Each facet except posted-within SHALL be multi-select (include-only for v1); posted-within SHALL be a single choice from the presets 1, 3, 7, 14, 30, 90, or Any.

#### Scenario: Selecting multiple values in one facet
- **WHEN** the user selects both `remote` and `hybrid` under work mode
- **THEN** the request repeats the parameter: `work_mode=remote&work_mode=hybrid`

#### Scenario: Posted-within is single choice
- **WHEN** the user picks "Last 7 days"
- **THEN** the request includes `posted_within_days=7`
- **AND** picking "Any" omits the parameter entirely

### Requirement: Filters screen
Tapping the Filters button SHALL open a full-screen modal listing the facet sections top-to-bottom, with a sticky footer containing "Clear all" and a primary apply button.

#### Scenario: Open and dismiss
- **WHEN** the user taps the Filters button
- **THEN** a full-screen Filters modal appears with the facet sections
- **AND** dismissing it without applying leaves the feed unchanged

### Requirement: Deferred apply with live count
The Filters screen SHALL edit a staged copy of the filters and fetch a live matching count from `GET /api/v1/jobs/facets` (with `disjunctive=1`) as selections change; the apply button SHALL read "Show N jobs" using that count, and selections SHALL commit to the feed only when the user taps it.

#### Scenario: Count updates while staging
- **WHEN** the user selects a facet value on the Filters screen
- **THEN** the apply button's count refreshes to the new matching total
- **AND** the feed behind the modal does not change yet

#### Scenario: Apply commits staged filters
- **WHEN** the user taps "Show N jobs"
- **THEN** the staged filters become the active filters
- **AND** the modal closes and the feed reloads with them applied

#### Scenario: Clear all resets staging
- **WHEN** the user taps "Clear all"
- **THEN** every staged facet selection is removed
- **AND** the live count reflects the unfiltered total

### Requirement: Active filter count badge
The feed toolbar SHALL display the total result count and a Filters button badged with the number of active filter values; the badge SHALL be hidden when no filters are active.

#### Scenario: Badge reflects selections
- **WHEN** two facet values are active
- **THEN** the Filters button shows a badge reading "2"

#### Scenario: No badge when empty
- **WHEN** no filters are active
- **THEN** the Filters button shows no badge

### Requirement: Country options are data-driven
The country facet SHALL present a searchable list whose options and counts come from the `facets.countries` distribution returned by the facets endpoint, busiest-first.

#### Scenario: Countries listed by frequency
- **WHEN** the user opens the country facet
- **THEN** the countries are listed in descending order of their result count
