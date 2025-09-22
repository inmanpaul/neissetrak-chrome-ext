/**
 * Env configuration for the extension runtime (MV3 service worker + popup).
 * No imports required; attaches to global as Env.
 */
(function (self) {
  const APP_BASE_URL = 'https://app.neissetrak.ovh'; // no trailing slash

  const AUTH_PATHS = {
    AUTH_STATUS_MINT: '/api/extension/auth',
    VERIFY: '/api/extension/verify',
    ME: '/api/extension/me',
    SIGNIN_UI: '/api/auth/signin',
    SIGNOUT_UI: '/api/auth/signout'
  };

  // Basic runtime validation
  function assert(cond, msg) {
    if (!cond) throw new Error(`[Env] ${msg}`);
  }

  assert(typeof APP_BASE_URL === 'string' && /^https?:\/\//.test(APP_BASE_URL), 'APP_BASE_URL must be a valid http(s) URL');
  assert(AUTH_PATHS && typeof AUTH_PATHS.AUTH_STATUS_MINT === 'string', 'AUTH_PATHS.AUTH_STATUS_MINT is required');
  assert(typeof AUTH_PATHS.VERIFY === 'string', 'AUTH_PATHS.VERIFY is required');
  assert(typeof AUTH_PATHS.ME === 'string', 'AUTH_PATHS.ME is required');

  const Env = {
    APP_BASE_URL,
    AUTH_PATHS,
    url: (path) => {
      if (!path.startsWith('/')) return `${APP_BASE_URL}/${path}`;
      return `${APP_BASE_URL}${path}`;
    }
  };

  // Expose to global
  self.Env = Env;
})(self);
