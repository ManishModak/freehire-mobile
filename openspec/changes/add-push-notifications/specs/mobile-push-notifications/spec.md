## ADDED Requirements

### Requirement: Enabling push registers this device
When a signed-in user switches push notifications on, the app SHALL request the OS notification permission, obtain this device's Expo push token using the EAS project id, and register it with `POST /api/v1/me/push-tokens` together with the platform (`ios` or `android`). On a platform where push is unavailable, no registration SHALL be attempted.

#### Scenario: User enables push
- **WHEN** the user switches push on and grants the OS permission
- **THEN** the app registers this device's Expo push token with the backend
- **AND** the switch settles in the on position

#### Scenario: Permission denied
- **WHEN** the user switches push on and denies the OS permission
- **THEN** no token is requested and no registration is attempted
- **AND** the switch returns to off with an explanation pointing at the device settings

### Requirement: Switch state is derived from the backend
The switch SHALL read on only when the OS permission is granted AND this device's token appears in `GET /api/v1/me/push-tokens`. The app SHALL NOT persist the state locally.

#### Scenario: Push already enabled on this device
- **WHEN** the Account screen opens with the permission granted and this device's token among the user's registered devices
- **THEN** the switch reads on

#### Scenario: Another device of the same account
- **WHEN** the user's registered devices contain only tokens belonging to other devices
- **THEN** the switch reads off on this device

#### Scenario: Permission revoked in system settings
- **WHEN** the user revokes the notification permission outside the app and returns to the Account screen
- **THEN** the switch reads off regardless of what the backend lists

### Requirement: Disabling push unregisters this device
Switching push off SHALL unregister this device's token via `DELETE /api/v1/me/push-tokens`. A `404` (the token is already not the caller's) SHALL be treated as success, since it is the state that was asked for.

#### Scenario: User disables push
- **WHEN** the user switches push off
- **THEN** the app unregisters this device's token and the switch reads off

#### Scenario: Token already gone
- **WHEN** unregistering returns 404 because the token was already pruned or reassigned
- **THEN** no error is shown and the switch reads off

### Requirement: Sign-out releases the device
Signing out SHALL unregister this device's token before the session ends, so the next account signing in on the device does not inherit the previous user's notifications. Sign-out SHALL complete even when that request fails.

#### Scenario: Signed-out user's device stops receiving
- **WHEN** a user with push enabled signs out
- **THEN** the app unregisters this device's token before calling logout

#### Scenario: Unregister fails
- **WHEN** the unregister request fails (offline, or the session is already gone)
- **THEN** sign-out still completes and the local session is cleared

### Requirement: Test notification
While push is on, the Account screen SHALL offer a "Send test notification" action calling `POST /api/v1/me/push-tokens/test`, and SHALL report the outcome using the response's per-device counts rather than the HTTP status alone.

#### Scenario: Delivered
- **WHEN** the response reports `sent` devices
- **THEN** the app confirms how many devices the test was sent to

#### Scenario: No registered device
- **WHEN** the response reports `devices: 0`
- **THEN** the app states that no device is registered, rather than reporting a successful send

#### Scenario: Registration turned out to be dead
- **WHEN** the response reports a `pruned` device
- **THEN** the app states the registration is no longer valid and asks the user to switch push off and on again
- **AND** does not describe it as sent

#### Scenario: Send failed
- **WHEN** the response reports a `failed` device
- **THEN** the app states that the notification could not be sent

### Requirement: Foreground presentation
The app SHALL present incoming notifications while it is in the foreground, as a banner and in the notification list, without playing a sound or setting a badge.

#### Scenario: Notification arrives while the app is open
- **WHEN** a push arrives while the user is in the app
- **THEN** it is shown as a banner and listed, silently and without a badge count
