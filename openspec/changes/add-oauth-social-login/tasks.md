## 1. Deep-link parser (TDD)

- [x] 1.1 Write failing tests for `codeFromCallbackUrl` (in `src/lib/oauth.ts`): code in query, `auth_error` in query, value in the URL fragment, empty string, and an unrelated/garbage URL (neither code nor error).
- [x] 1.2 Implement `codeFromCallbackUrl(url): { code?: string; error?: string }` until tests pass (tolerant of query or fragment; never throws).

## 2. API layer

- [x] 2.1 Add `oauthStartUrl(provider: string): string` to `src/lib/api.ts` — `${API_BASE}/api/v1/auth/oauth/${provider}/start?platform=mobile`.
- [x] 2.2 Add `exchangeOAuth(code: string): Promise<User>` — `POST /api/v1/auth/oauth/exchange` with `{ code }`, returns the user (the session cookie rides back into the jar); 401 → `ApiError`.
- [x] 2.3 Add `oauthProviders(): Promise<string[]>` — `GET /api/v1/auth/oauth/providers` (unwrap `{ data }`; tolerate failure at the call site).

## 3. Store + providers hook

- [x] 3.1 Add `signInWithProvider(provider)` to `src/lib/authStore.tsx`: `WebBrowser.openAuthSessionAsync(oauthStartUrl(provider), 'freehiremobile://auth-callback')`; on `success`, parse with `codeFromCallbackUrl`; if `code`, `exchangeOAuth` then set user + invalidate `['saved']`; if `error`, throw; on `cancel`/`dismiss`, resolve as a no-op.
- [x] 3.2 Add `useOAuthProviders()` — a React Query read of `oauthProviders`, `staleTime` long, that yields `[]` on error.

## 4. Auth modal UI

- [x] 4.1 Render a provider button row in `src/app/auth.tsx` from `useOAuthProviders()` (labels + brand-appropriate look), with a divider ("or") between it and the email form; hidden when the list is empty.
- [x] 4.2 Wire each button to `signInWithProvider`, with a per-button busy state and error mapping (reuse the modal's error line); cancel is silent.

## 5. Verify

- [x] 5.1 Run unit tests (`codeFromCallbackUrl`) and `tsc --noEmit`.
- [x] 5.2 With the providers list live, verify the buttons render; confirm cancel is a no-op and a simulated `auth_error` shows an error. (Full provider login + exchange is verified on a dev-client/device after the backend deploys.)
- [ ] 5.3 Run the `simplify` pass over the changed files, then request code review.

## 6. Backend contract (hire repo — tracked here, implemented separately)

- [x] 6.1 In `hire`: `?platform=mobile` on start (persist via state/return cookie), mobile branch in `OAuthCallback` (mint single-use ~60s code bound to user id, redirect to `freehiremobile://auth-callback?code=…` / `?auth_error=oauth`), and `POST /auth/oauth/exchange` (consume code, issue session cookie, return `{ data: User }`; invalid/expired/used → 401). Cover with Go tests. Deploy before enabling mobile OAuth.
