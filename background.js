// Spider Domain Lookup Chrome Extension - Background Service Worker
// Load shared environment and API utilities (MV3 service worker supports importScripts)
importScripts('env.js', 'api.js');

class SpiderBackground {
    constructor() {
        // Base URL of your Next.js app
        this.apiBaseUrl = 'https://app.neissetrak.ovh';

        // Auth endpoints and UI paths for NextAuth v5 backend
        this.AUTH_PATHS = {
            AUTH_STATUS_MINT: '/api/extension/auth',
            VERIFY: '/api/extension/verify',
            ME: '/api/extension/me',
            SIGNIN_UI: '/api/auth/signin',
            SIGNOUT_UI: '/api/auth/signout'
        };

        // In-memory auth state mirror of chrome.storage
        this.auth = { token: null, expiresAt: null, user: null, lastVerifiedAt: null };
        this.pollIntervalId = null;

        this.setupMessageListener();
        this.setupAuthLifecycle();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async response
        });
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'domainLookup': {
                    const domainResult = await this.performDomainLookup(request.domain);
                    sendResponse(domainResult);
                    break;
                }

                case 'crawlPage': {
                    const crawlResult = await this.performPageCrawl(request);
                    sendResponse(crawlResult);
                    break;
                }

                // ===== Auth messaging API =====
                case 'auth:getState': {
                    const state = await this.getAuthState();
                    sendResponse({ success: true, state });
                    break;
                }

                case 'auth:refresh': {
                    const result = await this.tryAuthenticate(true);
                    sendResponse(result);
                    break;
                }

                case 'auth:login': {
                    const result = await this.openLoginAndPoll();
                    sendResponse(result);
                    break;
                }

                case 'auth:logout': {
                    await this.logout();
                    sendResponse({ success: true });
                    break;
                }

                case 'auth:verify': {
                    const token = request.token || (await this.getAuthState()).token;
                    if (!token) {
                        sendResponse({ success: false, error: 'No token to verify' });
                        break;
                    }
                    const verify = await this.verifyToken(token);
                    sendResponse({ success: true, verify });
                    break;
                }

                default: {
                    sendResponse({ success: false, error: 'Unknown action' });
                }
            }
        } catch (error) {
            console.error('Background error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async performDomainLookup(domain) {
        try {
            const url = `${this.apiBaseUrl}/spider/domain-lookup?domain=${encodeURIComponent(domain)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return {
                        success: true,
                        data: {
                            message: `Domain '${domain}' not found in database`,
                            domain: domain,
                            exists: false
                        }
                    };
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: {
                    ...data,
                    exists: true,
                    message: `Domain '${domain}' found in database`
                }
            };
        } catch (error) {
            console.error('Domain lookup error:', error);
            return {
                success: false,
                error: `Domain lookup failed: ${error.message}`
            };
        }
    }

    async performPageCrawl(request) {
        try {
            const { url, pageType, domContent } = request;
            
            // Prepare the load request payload with new parameter names
            const loadPayload = {
                url: url,
                page_type: pageType,
                dom: domContent.html
            };

            const response = await fetch(`${this.apiBaseUrl}/spider/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(loadPayload)
            });

            if (response.status !== 201) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Store the load data for later retrieval
            await this.storeCrawlData(data.run_id, {
                url: url,
                pageType: pageType,
                domContent: domContent,
                loadResponse: data,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                data: {
                    run_id: data.run_id,
                    status: data.status,
                    total_score: data.total_score,
                    data_id: data.data_id,
                    message: `Page load initiated for ${pageType}`,
                    url: url
                }
            };
        } catch (error) {
            console.error('Page load error:', error);
            return {
                success: false,
                error: `Page load failed: ${error.message}`
            };
        }
    }

    extractProductUrls(html) {
        // Simple regex to find potential product URLs
        const productUrlPatterns = [
            /href=["']([^"']*\/product\/[^"']*)["']/gi,
            /href=["']([^"']*\/item\/[^"']*)["']/gi,
            /href=["']([^"']*\/p\/[^"']*)["']/gi
        ];
        
        const urls = new Set();
        productUrlPatterns.forEach(pattern => {
            const matches = html.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const url = match.replace(/href=["']/, '').replace(/["']$/, '');
                    if (url && !url.startsWith('#')) {
                        urls.add(url);
                    }
                });
            }
        });
        
        return Array.from(urls);
    }

    extractListingUrls(html) {
        // Simple regex to find potential listing URLs
        const listingUrlPatterns = [
            /href=["']([^"']*\/category\/[^"']*)["']/gi,
            /href=["']([^"']*\/collection\/[^"']*)["']/gi,
            /href=["']([^"']*\/products\/[^"']*)["']/gi
        ];
        
        const urls = new Set();
        listingUrlPatterns.forEach(pattern => {
            const matches = html.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const url = match.replace(/href=["']/, '').replace(/["']$/, '');
                    if (url && !url.startsWith('#')) {
                        urls.add(url);
                    }
                });
            }
        });
        
        return Array.from(urls);
    }

    async storeCrawlData(nestId, data) {
        try {
            await chrome.storage.local.set({
                [`crawl_${nestId}`]: data
            });
        } catch (error) {
            console.error('Error storing crawl data:', error);
        }
    }

    async getCrawlData(nestId) {
        try {
            const result = await chrome.storage.local.get(`crawl_${nestId}`);
            return result[`crawl_${nestId}`];
        } catch (error) {
            console.error('Error retrieving crawl data:', error);
            return null;
        }
    }
  // ===================== AUTH INTEGRATION =====================
  setupAuthLifecycle() {
    // Initialize in-memory auth state from storage and schedule refresh if needed
    chrome.storage.local.get(['token', 'expiresAt', 'user', 'lastVerifiedAt'], (res) => {
      this.auth = {
        token: res.token || null,
        expiresAt: res.expiresAt || null,
        user: res.user || null,
        lastVerifiedAt: res.lastVerifiedAt || null
      };
      if (this.auth.expiresAt) {
        const expiresMs = new Date(this.auth.expiresAt).getTime();
        if (!Number.isNaN(expiresMs)) {
          this.scheduleRefreshAlarm(expiresMs);
        }
      }
    });

    // Kick off authentication attempts on install/startup
    chrome.runtime.onInstalled.addListener(() => {
      this.tryAuthenticate(false).catch((e) => console.error('onInstalled auth error:', e));
    });
    chrome.runtime.onStartup.addListener(() => {
      this.tryAuthenticate(false).catch((e) => console.error('onStartup auth error:', e));
    });

    // Alarm-driven refresh (both scheduled refresh and backoff retries use this name)
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'refresh-token') {
        this.tryAuthenticate(true).catch((e) => console.error('alarm refresh error:', e));
      }
    });
  }

  getAuthState() {
    return this.auth;
  }

  async setAuthState(next) {
    this.auth = { ...this.auth, ...next };
    const payload = {
      token: this.auth.token || null,
      expiresAt: this.auth.expiresAt || null,
      user: this.auth.user || null,
      lastVerifiedAt: this.auth.lastVerifiedAt || null
    };
    try {
      await chrome.storage.local.set(payload);
    } catch (e) {
      console.error('Failed to persist auth state:', e);
    }
    this.broadcastAuthUpdate();
  }

  async clearAuthState() {
    this.auth = { token: null, expiresAt: null, user: null, lastVerifiedAt: null };
    try {
      await chrome.storage.local.remove(['token', 'expiresAt', 'user', 'lastVerifiedAt']);
    } catch (e) {
      console.error('Failed clearing auth state:', e);
    }
    try {
      await chrome.alarms.clear('refresh-token');
    } catch {}
    this.broadcastAuthUpdate();
  }

  broadcastAuthUpdate() {
    try {
      chrome.runtime.sendMessage({ type: 'auth:updated', state: this.auth });
    } catch {
      // ignore if no listeners
    }
  }

  scheduleRefreshAlarm(expiresMs) {
    if (!expiresMs) return;
    // schedule 60s before expiry, but at least 5s from now
    const when = Math.max(Date.now() + 5000, expiresMs - 60_000);
    try {
      chrome.alarms.create('refresh-token', { when });
    } catch (e) {
      console.error('Failed to create refresh alarm:', e);
    }
  }

  msToExpiry() {
    if (!this.auth?.expiresAt) return null;
    const ms = new Date(this.auth.expiresAt).getTime() - Date.now();
    return Number.isNaN(ms) ? null : ms;
  }

  isTokenValid() {
    const ms = this.msToExpiry();
    return Boolean(this.auth?.token) && ms !== null && ms > 10_000;
  }

  authBackoffMs = 60_000; // start at 1 minute, cap at 15 minutes

  scheduleBackoff() {
    const next = Math.min(this.authBackoffMs, 15 * 60 * 1000);
    this.authBackoffMs = Math.min(next * 2, 15 * 60 * 1000);
    try {
      chrome.alarms.create('refresh-token', { when: Date.now() + next });
    } catch {}
  }

  async tryAuthenticate(force = false) {
    // 1) Bearer path: if we have a valid token and not forced, consider authenticated
    if (!force && this.isTokenValid()) {
      this.verifyTokenSilently();
      return { success: true, state: this.getAuthState() };
    }

    // 2) Session path: call /api/extension/auth with credentials: 'include'
    try {
      const res = await self.Api.getAuthStatusAndMint();
      if (res && res.authenticated) {
        let expiresAtIso = null;
        if (res.expiresAt) {
          // backend may return ISO or epoch; normalize to ISO
          expiresAtIso = typeof res.expiresAt === 'string' ? res.expiresAt : new Date(res.expiresAt).toISOString();
        } else if (res.ttlSeconds) {
          expiresAtIso = new Date(Date.now() + res.ttlSeconds * 1000).toISOString();
        }

        await this.setAuthState({
          token: res.token || null,
          user: res.user || null,
          expiresAt: expiresAtIso
        });

        if (expiresAtIso) {
          this.scheduleRefreshAlarm(new Date(expiresAtIso).getTime());
        }

        // reset backoff on success
        this.authBackoffMs = 60_000;
        return { success: true, state: this.getAuthState() };
      } else {
        // Unauthenticated response
        await this.clearAuthState();
        this.scheduleBackoff();
        return { success: true, authenticated: false, state: this.getAuthState() };
      }
    } catch (e) {
      console.error('Auth/mint failed:', e);
      this.scheduleBackoff();
      return { success: false, error: e.message || 'Auth request failed' };
    }
  }

  async verifyToken(token) {
    try {
      const result = await self.Api.verifyToken(token);
      if (result?.valid) {
        await this.setAuthState({ lastVerifiedAt: new Date().toISOString() });
      }
      return result;
    } catch (e) {
      return { valid: false, error: e.message || 'Verify failed' };
    }
  }

  async verifyTokenSilently() {
    if (!this.auth?.token) return;
    try {
      await self.Api.verifyToken(this.auth.token);
      await this.setAuthState({ lastVerifiedAt: new Date().toISOString() });
    } catch {
      // ignore background verify failures
    }
  }

  async openLoginAndPoll() {
    // open NextAuth sign-in UI
    try {
      await chrome.tabs.create({ url: `${this.apiBaseUrl}${this.AUTH_PATHS.SIGNIN_UI}` });
    } catch (e) {
      console.error('Failed to open sign-in tab:', e);
    }

    const started = Date.now();
    const timeoutMs = 60_000;
    const pollDelay = 2_000;

    return new Promise((resolve) => {
      const poll = async () => {
        if (Date.now() - started > timeoutMs) {
          resolve({ success: false, error: 'Login timed out' });
          return;
        }
        try {
          const res = await self.Api.getAuthStatusAndMint();
          if (res?.authenticated) {
            const expiresAtIso =
              res.expiresAt
                ? (typeof res.expiresAt === 'string' ? res.expiresAt : new Date(res.expiresAt).toISOString())
                : new Date(Date.now() + (res.ttlSeconds || 3600) * 1000).toISOString();

            await this.setAuthState({
              token: res.token || null,
              user: res.user || null,
              expiresAt: expiresAtIso
            });
            this.scheduleRefreshAlarm(new Date(expiresAtIso).getTime());
            resolve({ success: true, state: this.getAuthState() });
            return;
          }
        } catch {
          // ignore errors and continue polling
        }
        setTimeout(poll, pollDelay);
      };
      poll();
    });
  }

  async logout() {
    await this.clearAuthState();
    try {
      await chrome.tabs.create({ url: `${this.apiBaseUrl}${this.AUTH_PATHS.SIGNOUT_UI}` });
    } catch {
      // ignore if cannot open tab
    }
  }
}

// Initialize the background service worker
new SpiderBackground();
