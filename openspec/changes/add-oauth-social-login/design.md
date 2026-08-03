## Context

Email/password auth already works via the native cookie jar: `login`/`register` set the `hire_token` cookie, `GET /auth/me` reports the user, and `authStore` mirrors it. Social sign-in can't reuse the web flow: the web callback sets a cookie and 302s to an https page, but a native `ASWebAuthenticationSession` only finishes on a **custom-scheme** redirect and keeps its cookies in an isolated store the app's `fetch` can't read.

## Goals / Non-Goals

**Goals:**
- GitHub / Google / LinkedIn sign-in on mobile, reusing the existing session/user model.
- No long-lived token in any URL; the app ends up with the same `hire_token` cookie as email/password.
- A pure, unit-tested deep-link parser.

**Non-Goals:**
- Provider-side config changes (their redirect_uri stays the backend callback).
- Account linking, Apple Sign In, token refresh. Email/password remains primary.

## Decisions

- **One-time-code exchange, exchanged by the app.** The browser flow's only job is to deliver a single-use `code` to the app via `freehiremobile://auth-callback?code=…`. The app then POSTs that code to `/auth/oauth/exchange` **with its own fetch**, so the `Set-Cookie` from the exchange lands in the app's native cookie jar — the exact same session state email/password produces. *Alternatives:* (a) put the JWT in the deep-link URL — rejected (long-lived secret in a URL, logged/leakable); (b) share the auth-session cookie jar — not possible with `ASWebAuthenticationSession`.
- **`openAuthSessionAsync` over `expo-auth-session`.** `WebBrowser.openAuthSessionAsync(startUrl, 'freehiremobile://auth-callback')` opens the flow and resolves with the redirect URL when the scheme is hit — everything we need, no extra dependency. `expo-auth-session` adds PKCE/discovery machinery we don't use (the backend owns the provider exchange).
- **Backend owns the mobile branch.** `?platform=mobile` on start is remembered (in the existing state/return cookie); the callback, when mobile, mints the code and redirects to the custom scheme instead of setting the cookie + web redirect. This keeps all provider-secret handling server-side. The one-time code is single-use, ~60s TTL, bound to the resolved user id.
- **Parser is pure and tested.** `codeFromCallbackUrl(url)` reads `code` / `auth_error` from query or fragment. It's the one piece with real branching, so it's the TDD target; the browser/exchange orchestration is thin glue.
- **Providers fetched, not hard-coded.** `useOAuthProviders` reads `/auth/oauth/providers` (cached, non-blocking); a failure just hides the buttons so the email form is never gated on it.

## Risks / Trade-offs

- **Backend not yet deployed** → OAuth is inert. Mitigation: ship the mobile code behind the live providers list (empty list = no buttons), so nothing breaks pre-deploy; land the backend + deploy before enabling.
- **Custom-scheme capture flakiness** (Expo Go vs dev-client) → Mitigation: the scheme `freehiremobile` is set in `app.json`; verify on a dev-client/device, not Expo Go screenshots.
- **User cancels the session** → `openAuthSessionAsync` resolves `{ type: 'cancel' | 'dismiss' }`. Mitigation: treat cancel/dismiss as a no-op (no error banner), only real `auth_error`/exchange failures show an error.
- **Code interception** (a malicious app claiming the scheme) → Mitigation: the code is single-use and short-lived, and only mints a session for the already-authenticated provider identity; still, prefer HTTPS App/Universal Links over a custom scheme in a later hardening pass (noted, out of scope here).

## Migration Plan

1. Land the backend mobile flow in `hire` (start `platform=mobile`, callback mobile branch, one-time-code store, `/exchange`) with Go tests; deploy.
2. Land the mobile parser + api + store + provider buttons (this change); it stays inert until the providers list is live and the backend is deployed.
3. Verify end-to-end on a dev-client/device per provider.

Rollback: hide the provider buttons (they already hide when the providers request fails); the email/password path is untouched.

## Open Questions

- Whether to move to Universal/App Links instead of a custom scheme for the callback (security hardening) — deferred; custom scheme is sufficient for v1.
