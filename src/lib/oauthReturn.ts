import { apiBase } from './config';

/**
 * Where the v2 OAuth handshake comes back to.
 *
 * A verified HTTPS link, not the `freehiremobile://` scheme: any app on the
 * device can claim a custom scheme and intercept the code, while a universal
 * link (iOS) / App Link (Android) only opens an app the domain has vouched for
 * in `/.well-known/`. The backend stores this URL per platform in
 * `MOBILE_AUTH_CALLBACKS` and appends `?code=` or `?auth_error=` to it; the
 * client only names the platform, so this constant must match the deployed
 * config exactly.
 */
export const MOBILE_OAUTH_CALLBACK_PATH = '/auth/mobile-callback';

export function mobileOAuthReturnUrl(): string {
  return `${apiBase}${MOBILE_OAUTH_CALLBACK_PATH}`;
}
