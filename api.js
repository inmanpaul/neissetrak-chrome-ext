/**
 * API client for MV3 extension & NextAuth v5 backend.
 * Attaches Api to global self for use in background and popup.
 * Requires env.js loaded first (self.Env).
 */
(function (self) {
  if (!self.Env) {
    throw new Error('[Api] Env is not available. Load env.js before api.js');
  }

  const BASE = self.Env.APP_BASE_URL;
  const PATHS = self.Env.AUTH_PATHS;

  const defaultHeaders = {
    Accept: 'application/json'
  };

  function url(path) {
    return self.Env.url(path);
  }

  async function parseJsonSafely(resp) {
    try {
      const text = await resp.text();
      if (!text) return null;
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function jsonFetch(u, init) {
    const resp = await fetch(u, init);
    const json = await parseJsonSafely(resp);
    if (!resp.ok) {
      const message = json?.error || json?.message || `HTTP ${resp.status}`;
      const error = new Error(message);
      error.status = resp.status;
      error.details = json || null;
      throw error;
    }
    return json;
  }

  // GET /api/extension/auth with credentials: 'include'
  async function getAuthStatusAndMint() {
    const u = url(PATHS.AUTH_STATUS_MINT);
    return jsonFetch(u, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: { ...defaultHeaders }
    });
  }

  // POST /api/extension/verify { token }
  async function verifyToken(token) {
    const u = url(PATHS.VERIFY);
    return jsonFetch(u, {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
  }

  // GET /api/extension/me with Authorization: Bearer
  async function getMeWithBearer(token) {
    const u = url(PATHS.ME);
    return jsonFetch(u, {
      method: 'GET',
      headers: {
        ...defaultHeaders,
        Authorization: `Bearer ${token}`
      }
    });
  }

  // GET /api/extension/me with credentials include (session cookie)
  async function getMeWithSession() {
    const u = url(PATHS.ME);
    return jsonFetch(u, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      headers: { ...defaultHeaders }
    });
  }

  self.Api = {
    getAuthStatusAndMint,
    verifyToken,
    getMeWithBearer,
    getMeWithSession
  };
})(self);