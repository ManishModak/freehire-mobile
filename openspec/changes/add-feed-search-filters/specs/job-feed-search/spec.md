## ADDED Requirements

### Requirement: Free-text search on the feed
The feed SHALL provide a text input that searches jobs by keyword. The query SHALL be sent as the `q` parameter to `GET /api/v1/jobs/search`, and the feed SHALL render the returned jobs in place of the unfiltered list.

#### Scenario: Typing a query narrows the feed
- **WHEN** the user types "react" into the search box
- **THEN** the feed requests `/api/v1/jobs/search?q=react&...&limit=20&offset=0`
- **AND** replaces the visible jobs with the search results

#### Scenario: Clearing the query restores the full feed
- **WHEN** the user clears the search box
- **THEN** the `q` parameter is omitted from the request
- **AND** the feed shows the newest-first stream (same as before any query)

### Requirement: Search input is debounced
The feed SHALL debounce the applied query by 300ms so that a request is not issued on every keystroke, while the visible input value updates immediately.

#### Scenario: Rapid typing issues one request
- **WHEN** the user types five characters within 300ms
- **THEN** the input shows all five characters immediately
- **AND** only one search request is issued, for the final value, after the pause

### Requirement: Search results paginate
Search results SHALL page with `limit`/`offset` and stop requesting further pages once `offset + returned < meta.total`.

#### Scenario: Infinite scroll through results
- **WHEN** the user scrolls near the end of the results
- **THEN** the next page is requested with `offset` advanced by the page size
- **AND** no further page is requested once all `meta.total` results are loaded

### Requirement: Search composes with active filters
The search query SHALL be combined with any active filters into a single request, so results honour both simultaneously.

#### Scenario: Query plus filter
- **WHEN** the user has `work_mode=remote` selected and types "designer"
- **THEN** the request includes both `q=designer` and `work_mode=remote`
