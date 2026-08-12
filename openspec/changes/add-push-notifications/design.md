## Context

The backend side already exists, finished and on `main` in `hire` (`push-notification-infra`, 14/14 tasks): `user_push_tokens`, `internal/pushnotify` (Expo Push API + ticket outbox), the `cmd/push-receipts` receipt worker, and the endpoints below. Its proposal hands the client off explicitly: *"Mobile app: out of scope… a separate, later change."*

The contract, read from the code rather than assumed:

| Endpoint | Body | Success | Notes |
|---|---|---|---|
| `POST /api/v1/me/push-tokens` | `{token, platform}` | `204` | upsert **by token**; re-registering reassigns the device to the caller. `platform` must be exactly `ios` or `android` |
| `GET /api/v1/me/push-tokens` | — | `200 {data:[…],meta:{total}}` | **added by this work** — see below |
| `DELETE /api/v1/me/push-tokens` | `{token}` | `204` | `404` when the token isn't the caller's |
| `POST /api/v1/me/push-tokens/test` | — | `200 {data:{devices,sent,pruned,failed}}` | pushes only to the caller's own tokens |

All are cookie-only (`mw.cookie`); the tests on `main` assert a Bearer token is rejected. The app's session rides React Native's native cookie jar, so this needs no auth work — though `hire` has an in-flight `AUTH_V2_ENABLED` mobile-auth migration (`0087_mobile_auth_v2.sql`), and if mobile moves to bearer sessions these calls move with it.

## Goals / Non-Goals

**Goals:**
- A registered token for every user who wants push, and none for a user who doesn't.
- A switch that stays where the user put it, across launches.
- A test send whose outcome is legible to the person who pressed it.
- Notifications visible while the app is open.

**Non-Goals:**
- Deep-linking from a tapped notification. `pushnotify.Send(ctx, token, title, body)` sends no data payload, so there is no route to read. A parser for payloads nothing sends is speculation; tap-routing belongs with the backend change that gives digests a payload.
- Badges, grouping, per-subscription channel preferences, local notifications.

## Decisions

- **The backend gained `GET /me/push-tokens` instead of the app gaining local storage.** The switch must read on/off correctly at launch. The OS permission cannot express it — an app cannot revoke its own permission, so permission stays granted after a user switches push off, and a client deriving state from permission alone re-registers itself on the next launch. That left two options: persist an opt-in flag in the app (a new dependency, and a second source of truth that drifts whenever a token is reassigned to another account or pruned by `cmd/push-receipts`), or let the backend answer the question it already knows the answer to. The endpoint reuses the existing `ListPushTokensForUser` query — no new SQL, no `sqlc` run — and is the smaller change. `enabled = permission granted AND this device's token ∈ the user's devices`, with no local state at all.

- **The token itself is returned by the list.** It is the only field that identifies *which* device a row is, and matching it is the whole point of the read. It goes only to the account that registered it, over a cookie-authenticated request, and it is a send capability for our own notifications — not a credential to the account.

- **A rotated token reads as "off" rather than being silently re-registered.** Re-registering whatever token the device currently reports would also re-register a device the user had switched off — the exact bug the design avoids, since the app cannot tell the two situations apart. So rotation surfaces as an off switch that one tap fixes, and the orphaned row is pruned by the receipt worker. Correctness over a rare convenience.

- **The test result is reported by its four counts, not by HTTP status.** `devices: 0` is a `200` that sent nothing; `pruned` means Expo reported the token dead and the backend just removed it — a successful call that delivered nothing and needs re-registering. Collapsing these into "sent!"/"error" would hide the two outcomes a user must act on. `describeTestPush` is that mapping, pure and unit-tested.

- **Permission denial is a state, not a thrown error.** `getPushToken(prompt)` resolves `null` for every "not available here" — web, permission denied, no EAS project id, Expo's token service unreachable — because a caller asking *what is the current state* must not have to catch. Only the user-initiated `enable()` prompts; a screen opening never does.

- **Token mechanics live in `push.ts`, the hook in `usePushNotifications.ts`.** `authStore` must unregister the device on sign-out, and `push.ts` must not import `authStore` for that to be possible without an import cycle. The split also matches the repo's existing convention of one hook per file (`useSavedJobs.ts`, `useJob.ts`).

- **Sign-out unregisters before logging out, best-effort.** The call is cookie-authenticated, so after `POST /auth/logout` there is nothing left to authorize it — order matters. Failure is swallowed: signing out is the user's decision, not the network's.

- **Foreground presentation on, sound and badge off.** A job alert arriving while the user is already reading the feed does not warrant a sound, and nothing in the app clears a badge — setting one would strand a number on the icon.

## Risks / Trade-offs

- **The backend addition is compiled and unit-tested, but not exercised against Postgres.** `go build ./...`, `go vet -tags=integration ./internal/handler/` and the `PushToken` unit tests all pass in a clean clone with `GOPROXY=direct`. The `list is owner-scoped` integration subtest compiles but has never run — that needs Docker (testcontainers), which this environment lacks. Delivered as `hire-push-tokens-list.patch`, also applied on the branch `feat/push-tokens-list` in `~/Projects/hire-fresh`.

- **No credentials, no delivery.** Without an APNs key (iOS) or FCM v1 (Android) in the EAS project, token acquisition or the send fails. *Mitigation:* the test button reports `failed` counts, so a credential gap shows up in the app rather than as silence.

- **Expo Go cannot receive remote push** (removed in SDK 53) — the test suite prints Expo's own warning to that effect. *Mitigation:* verify on a dev build; `package.json` already runs `expo run:ios` / `expo run:android`.

- **`expo-notifications@~57.0.10` was resolved from the npm registry, not `expo install`** — `api.expo.dev` is unreachable from this environment, so Expo's compatibility check never ran. *Mitigation:* the version matches the SDK 57 line used by every other `expo-*` package here, and `tsc --noEmit` plus the suite pass; re-check with `npx expo install --check` from a network that can reach Expo.
