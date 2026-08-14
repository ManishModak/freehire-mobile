// CommonJS on purpose, and at the repo root on purpose. `app.config.ts` is
// transpiled on its own by Expo — Node resolves whatever it imports, so a
// `./src/lib/*.ts` import fails at config-read time and takes `expo start`,
// `expo config`, and every EAS build down with it. A plain .js file is the one
// shape both that loader and Metro can read, which lets the build-time config
// and the runtime client share a single definition instead of two that drift.

const DEFAULT_DEVELOPMENT_API_BASE = 'http://localhost:8080';
const DEFAULT_PRODUCTION_API_BASE = 'https://freehire.me';

/**
 * The single rule for what may serve as the API origin.
 *
 * Accepts an origin only: HTTPS everywhere, plus plain HTTP on localhost and the
 * Android emulator host during development. Credentials, a path, a query, or a
 * fragment are all rejected — every caller appends its own path.
 *
 * Throws on anything invalid. The build fails on that; the runtime falls back
 * (see `src/lib/config.ts`) because a validated value is already baked in.
 *
 * @param {string | undefined} value
 * @param {boolean} allowLocalHttp
 * @returns {string}
 */
function normalizeApiBase(value, allowLocalHttp) {
  const candidate = (value && value.trim()) || (allowLocalHttp ? DEFAULT_DEVELOPMENT_API_BASE : '');
  if (!candidate) {
    throw new Error('EXPO_PUBLIC_API_BASE is required for preview and production builds');
  }

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE must be a valid URL origin');
  }

  const isLocalhost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '10.0.2.2';
  const allowedProtocol =
    parsed.protocol === 'https:' || (allowLocalHttp && isLocalhost && parsed.protocol === 'http:');
  if (!allowedProtocol) {
    throw new Error('EXPO_PUBLIC_API_BASE must use HTTPS (development may use localhost HTTP)');
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('EXPO_PUBLIC_API_BASE must be an origin without credentials, path, query, or fragment');
  }

  return parsed.origin;
}

module.exports = {
  DEFAULT_DEVELOPMENT_API_BASE,
  DEFAULT_PRODUCTION_API_BASE,
  normalizeApiBase,
};
