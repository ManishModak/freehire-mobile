## Why

The mobile app has email/password sign-in, but freehire.dev also offers GitHub / Google / LinkedIn. The web OAuth flow can't be reused as-is on mobile: it ends by setting an httpOnly cookie after an https redirect, which a native in-app browser can neither complete (it needs a custom-scheme redirect to finish) nor share cookies with the app. Social sign-in on mobile needs a mobile-aware handshake.

## What Changes

- Add **social sign-in buttons** (GitHub / Google / LinkedIn) to the auth modal, listed from `GET /api/v1/auth/oauth/providers`.
- Implement the **one-time-code exchange** handshake on mobile: open the provider flow in an auth session, capture the `code` from a `freehiremobile://auth-callback` deep link, then exchange it via the app's own `fetch` (so the returned session cookie lands in the app's native cookie jar).
- **BREAKING (backend dependency):** requires a mobile-aware backend flow in the `hire` repo — `?platform=mobile` on start, a custom-scheme redirect carrying a single-use code from the callback, and a new `POST /api/v1/auth/oauth/exchange`. Providers need no change (their `redirect_uri` stays the backend callback). The mobile feature is inert until that backend ships.

Non-goals: account-linking UI, Apple Sign In, token refresh. Email/password stays the primary path.

## Capabilities

### New Capabilities
- `mobile-oauth-login`: social sign-in on mobile via a one-time-code exchange — provider buttons, the auth-session handshake, deep-link code capture, and cookie-bearing exchange.

### Modified Capabilities
- `job-feed` <!-- none: there are no existing specs for auth; the auth modal is new UI from the prior change, not yet a spec. -->

## Impact

- **Mobile (this repo):** `src/lib/api.ts` (`oauthStartUrl`, `exchangeOAuth`), a pure `codeFromCallbackUrl` parser, `src/lib/authStore.tsx` (`signInWithProvider`), `src/app/auth.tsx` (provider buttons), a `useOAuthProviders` read. Uses `expo-web-browser` (installed) + `expo-linking`; scheme `freehiremobile` already in `app.json`.
- **Backend (`hire`, separate repo):** `/auth/oauth/:provider/start?platform=mobile`, mobile branch in `OAuthCallback`, one-time-code store, `POST /auth/oauth/exchange`. Implemented with Go tests; must be deployed before mobile OAuth works.
- **Verification:** unit tests for the parser here; Go tests in `hire`; end-to-end (custom scheme + provider login) is manual on a dev-client/device after deploy.
