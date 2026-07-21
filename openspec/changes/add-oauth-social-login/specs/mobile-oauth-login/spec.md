## ADDED Requirements

### Requirement: Provider buttons
The auth modal SHALL show a sign-in button for each provider returned by `GET /api/v1/auth/oauth/providers`, alongside the email/password form. When the list is empty or the request fails, no provider buttons SHALL render (the email form remains fully usable).

#### Scenario: Providers listed
- **WHEN** the providers endpoint returns `["github","google","linkedin"]`
- **THEN** the auth modal shows a button for each, labelled per provider

#### Scenario: No providers
- **WHEN** the providers request fails or returns an empty list
- **THEN** no provider buttons render and the email/password form still works

### Requirement: One-time-code handshake
Tapping a provider button SHALL open the provider flow in an auth session at `GET /api/v1/auth/oauth/{provider}/start?platform=mobile` with the redirect target `freehiremobile://auth-callback`, then extract the `code` from the returned deep link and exchange it via `POST /api/v1/auth/oauth/exchange`. The exchange request is made by the app so its session cookie is stored for later authenticated calls.

#### Scenario: Successful sign-in
- **WHEN** the flow returns `freehiremobile://auth-callback?code=abc`
- **THEN** the app POSTs `{ code: "abc" }` to the exchange endpoint
- **AND** on success sets the current user and closes the modal

#### Scenario: Provider error in the callback
- **WHEN** the flow returns `freehiremobile://auth-callback?auth_error=oauth`
- **THEN** no exchange is attempted and a sign-in error is shown

#### Scenario: User cancels the auth session
- **WHEN** the user dismisses the auth session without completing it
- **THEN** no exchange is attempted and the modal returns to its idle state (no error banner)

### Requirement: Deep-link code parser
The app SHALL parse the callback deep link with a pure function that returns the `code` on success or the `error` on failure, tolerating the value in either the query string or the URL fragment and returning neither for a malformed or unrelated URL.

#### Scenario: Code in query
- **WHEN** parsing `freehiremobile://auth-callback?code=xyz`
- **THEN** the result carries `code = "xyz"` and no error

#### Scenario: Error marker
- **WHEN** parsing `freehiremobile://auth-callback?auth_error=oauth`
- **THEN** the result carries an error and no code

#### Scenario: Malformed URL
- **WHEN** parsing an empty string or a URL with neither `code` nor `auth_error`
- **THEN** the result carries neither a code nor an error

### Requirement: Exchange failure surfaces an error
A rejected exchange (invalid, expired, or already-used code → 401) SHALL leave the user signed out and show a friendly sign-in error, not a crash.

#### Scenario: Expired code
- **WHEN** the exchange endpoint responds 401
- **THEN** the user remains signed out and an error message is shown in the modal
