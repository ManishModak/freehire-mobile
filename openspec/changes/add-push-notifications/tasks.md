## 0. Discover the real contract

- [x] 0.1 Establish what already exists: `hire`'s `push-notification-infra` is complete on `main` (register/unregister/test endpoints, `internal/pushnotify`, `cmd/push-receipts`), and its proposal hands the mobile client off to a separate change — this one. The local `../hire` checkout could not show this: its git object database is damaged (`HEAD`, `main`, `origin/main` all unreadable) and it sits on an unrelated branch, so `main` was read from a `codeload.github.com` snapshot instead.

## 1. Backend gap (`hire`, delivered as a patch)

- [x] 1.1 Add `GET /me/push-tokens` (`ListPushTokens`) so a client can read its own device registration — without it the app needs a local opt-in flag that drifts from the backend. Reuses `ListPushTokensForUser`; no new SQL, no `make sqlc`.
- [x] 1.2 Extend the cookie-only test table with `GET`, and `TestPushTokensEndToEnd` with a `list is owner-scoped` subtest.
- [x] 1.3 Record the addition in the backend change's `proposal.md` / `tasks.md` (section 6) and export `hire-push-tokens-list.patch`.
- [x] 1.4 Verified after all. The network turned out to be intermittently dropping connections rather than blocking hosts, so a healthy clone (`~/Projects/hire-fresh`) and `GOPROXY=direct` (routing around the unreachable module proxy) made the Go toolchain usable: `go build ./...` exit 0, `go build ./internal/handler/` exit 0, `go vet -tags=integration ./internal/handler/` exit 0 — which is what compiles the new `list is owner-scoped` subtest — `go test ./internal/handler/ -run PushToken` all pass (including the two new cookie-only `GET` cases), `gofmt` clean. The full module gates also pass: `go vet ./...` exit 0 and `go vet -tags=integration ./...` exit 0 (the check `AGENTS.md` demands before every push). `go test ./...` exits 1 on exactly one failure — see 1.5. **Not** verified: the integration test *running* against Postgres (no Docker here).
- [x] 1.5 Pre-existing failure, not ours: `TestExtractResumeProfile_PDF` fails in `internal/handler` (`status = 400, want 200`). Confirmed identical on clean `main` with the patch stashed.

## 2. Dependency and config

- [x] 2.1 Install `expo-notifications@~57.0.10` (pinned by hand — `npx expo install` cannot reach `api.expo.dev` from here).
- [x] 2.2 Add the `expo-notifications` plugin to `app.json`, reusing `android-icon-monochrome.png` as the Android notification icon (already a white-on-transparent mark) and the brand olive as its tint.

## 3. Pure logic (TDD)

- [x] 3.1 RED: `src/lib/push.test.ts` for `describeTestPush` (no devices / one / many / pruned / failed / mixed) and `isRegistered` (this device, another device, no token, empty list).
- [x] 3.2 GREEN: implement both in `src/lib/push.ts`. 10 tests pass.

## 4. Device mechanics and API

- [x] 4.1 `PushDevice` / `TestPushResult` wire types in `src/lib/types.ts`.
- [x] 4.2 `registerPushToken`, `listPushDevices`, `unregisterPushToken` (404 swallowed), `sendTestPush` in `src/lib/api.ts`.
- [x] 4.3 `getPushToken(prompt)` in `src/lib/push.ts`: platform guard, permission check (prompting only when asked), Android channel, EAS project id, `null` for every unavailable case rather than throwing.
- [x] 4.4 `unregisterThisDevice()` for sign-out, kept in `push.ts` so `authStore` can call it without an import cycle.

## 5. Hook and UI

- [x] 5.1 `src/lib/usePushNotifications.ts`: state derived from the device list + token, `enable`/`disable`/`sendTest`, one visible error, busy flag.
- [x] 5.2 Account screen: "Push notifications" row with a `Switch`, "Send test notification" while on, and one note line (error red or the test outcome).
- [x] 5.3 `authStore.signOut` unregisters this device *before* logout (the call is cookie-authenticated) and drops the `['push']` cache.
- [x] 5.4 `setNotificationHandler` in `src/app/_layout.tsx`: banner + list, no sound, no badge.

## 6. Verification

- [x] 6.1 `npm test` — 56 tests, 7 suites, green.
- [x] 6.2 `npx tsc --noEmit` — clean.
- [ ] 6.3 Provision push credentials in EAS: APNs key (iOS, needs a paid Apple account) and FCM v1 (Android).
- [ ] 6.4 On a dev build against the deployed backend (needs 1.4 merged first): switch on, confirm the device appears in `GET /me/push-tokens`, send a test push and confirm it arrives in foreground and background, switch off and confirm the device is gone, then sign out with push on and confirm the token is released.
- [ ] 6.5 `simplify` pass over the changed files, then code review.
