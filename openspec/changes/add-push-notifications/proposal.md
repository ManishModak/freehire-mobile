## Why

The backend side of push already exists and is finished: the `push-notification-infra` change in `hire` (all 14 tasks done, on `main`) added `user_push_tokens`, `internal/pushnotify` (Expo Push API send + ticket outbox), the `cmd/push-receipts` receipt-polling worker, and three endpoints under `/api/v1/me/push-tokens`. Its proposal closes with the explicit hand-off: *"Mobile app (`freehire-mobile`): out of scope for this change… a separate, later change."*

This is that change. Today nothing can ever call those endpoints — the app has no `expo-notifications`, no permission flow, and no way to obtain an Expo push token. The backend's whole push path is unreachable and unproven on a real device until the app registers one.

## What Changes

- Add **`expo-notifications`** and its `app.json` plugin block; add **`@react-native-async-storage/async-storage`** for the one thing that must outlive a launch (see design).
- **Request notification permission and register the device token** against `POST /api/v1/me/push-tokens`, refreshing it on every launch while push is on, so a rotated token replaces the stale one.
- Add a **"Push notifications" toggle** to the Account screen. Turning it off calls `DELETE /api/v1/me/push-tokens`; signing out does the same so the next account on the phone doesn't inherit the stream.
- Add **"Send test notification"**, calling `POST /api/v1/me/push-tokens/test` and reporting its four-way outcome (`devices`/`sent`/`pruned`/`failed`) in plain words — this is the only end-to-end proof that the Expo credential chain works, and the backend change's own verification notes it was never proven against a real device.
- **Present notifications in the foreground** (banner + list) rather than swallowing them while the app is open.

Non-goals: deep-linking from a tapped notification — `pushnotify.Send(ctx, token, title, body)` carries no data payload, so there is no route to read yet; it arrives with the follow-up backend change that wires push into `notify`/`reminder`/`nudge`. Also out of scope: per-subscription channel preferences, badges, grouping, local notifications.

## Capabilities

### New Capabilities
- `mobile-push-notifications`: notification permission, Expo push-token registration against the user's session, the Account toggle and test send, and foreground presentation.

### Modified Capabilities
- none <!-- no existing spec in this repo covers notifications -->

## Impact

- **This repo:** `expo-notifications` + `@react-native-async-storage/async-storage` dependencies and the `expo-notifications` plugin in `app.json`; new `src/lib/push.ts` (permission, token, opt-in persistence, test-result copy); `src/lib/api.ts` (`registerPushToken`, `unregisterPushToken`, `sendTestPush`); `src/app/_layout.tsx` (notification handler); `src/app/account.tsx` (toggle + test button); `src/lib/authStore.tsx` (unregister on sign-out).
- **Backend:** none. This change consumes the deployed contract as-is and adds nothing to it.
- **Build/credentials:** remote push needs a development or EAS build — Expo Go dropped it in SDK 53. An APNs key (iOS) and FCM v1 credentials (Android) must exist in EAS project `399c136d-96e9-4e2b-bf43-81a4eb00d8a9`.
- **Verification:** unit tests for the pure pieces (test-result copy, enablement rule); `tsc --noEmit`; a real push landing on a device is manual on a dev build.
