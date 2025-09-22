// Spider Domain Lookup Chrome Extension - Popup Script
class SpiderPopup {
    constructor() {
        this.currentTab = null;
        this.currentDomain = '';
        this.currentUrl = '';

        // Auth UI state
        this.auth = { token: null, user: null, expiresAt: null, lastVerifiedAt: null };
        this.countdownId = null;

        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        this.setupAuthListeners();
        this.updateCurrentDomainDisplay();
        // Initial auth state fetch
        this.refreshAuthState();
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            this.currentUrl = tab.url;
            this.currentDomain = new URL(tab.url).hostname;
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('domainLookupBtn').addEventListener('click', () => {
            this.performDomainLookup();
        });

        document.getElementById('crawlPageBtn').addEventListener('click', () => {
            this.performPageCrawl();
        });

        // Auth buttons (if present)
        const signInBtn = document.getElementById('authSignInBtn');
        const refreshBtn = document.getElementById('authRefreshBtn');
        const verifyBtn = document.getElementById('authVerifyBtn');
        const signOutBtn = document.getElementById('authSignOutBtn');

        if (signInBtn) {
            signInBtn.addEventListener('click', async () => {
                this.setAuthLoading('Opening sign-in…');
                const res = await chrome.runtime.sendMessage({ action: 'auth:login' });
                if (res?.success) {
                    this.setAuthSuccess('Signed in');
                    this.updateAuthUI(res.state);
                } else {
                    this.setAuthError(res?.error || 'Sign-in failed');
                }
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                this.setAuthLoading('Refreshing…');
                const res = await chrome.runtime.sendMessage({ action: 'auth:refresh' });
                if (res?.success) {
                    this.setAuthSuccess('Refreshed');
                    if (res.state) this.updateAuthUI(res.state);
                } else {
                    this.setAuthError(res?.error || 'Refresh failed');
                }
            });
        }

        if (verifyBtn) {
            verifyBtn.addEventListener('click', async () => {
                this.setAuthLoading('Verifying…');
                const res = await chrome.runtime.sendMessage({ action: 'auth:verify' });
                if (res?.success) {
                    const v = res.verify;
                    if (v?.valid) {
                        this.setAuthSuccess('Token is valid');
                        // refresh state to capture lastVerifiedAt
                        this.refreshAuthState();
                    } else {
                        this.setAuthError(v?.error || 'Token invalid');
                    }
                } else {
                    this.setAuthError(res?.error || 'Verify failed');
                }
            });
        }

        if (signOutBtn) {
            signOutBtn.addEventListener('click', async () => {
                this.setAuthLoading('Signing out…');
                await chrome.runtime.sendMessage({ action: 'auth:logout' });
                this.setAuthSuccess('Signed out');
                this.updateAuthUI({ token: null, user: null, expiresAt: null });
            });
        }
    }

    updateCurrentDomainDisplay() {
        document.getElementById('currentDomain').textContent = this.currentDomain;
        document.getElementById('currentUrl').textContent = this.currentUrl;
    }

    showStatus(message, type = 'loading') {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status ${type}`;
        statusEl.style.display = 'block';
    }

    hideStatus() {
        document.getElementById('status').style.display = 'none';
    }

    showResults(data) {
        const resultsEl = document.getElementById('results');
        resultsEl.innerHTML = '';
        
        if (typeof data === 'object') {
            Object.entries(data).forEach(([key, value]) => {
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `<strong>${key}:</strong> ${JSON.stringify(value, null, 2)}`;
                resultsEl.appendChild(item);
            });
        } else {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.textContent = data;
            resultsEl.appendChild(item);
        }
        
        resultsEl.style.display = 'block';
    }

    hideResults() {
        document.getElementById('results').style.display = 'none';
    }

    async performDomainLookup() {
        if (!this.currentDomain) {
            this.showStatus('No domain available', 'error');
            return;
        }

        this.showStatus('🔍 Looking up domain...', 'loading');
        this.hideResults();

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'domainLookup',
                domain: this.currentDomain
            });

            if (response.success) {
                this.showStatus('✅ Domain lookup successful!', 'success');
                this.showResults(response.data);
            } else {
                this.showStatus(`❌ ${response.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        }
    }

    async performPageCrawl() {
        if (!this.currentTab) {
            this.showStatus('No active tab available', 'error');
            return;
        }

        const pageType = document.getElementById('pageType').value;
        this.showStatus('🕷️ Loading page...', 'loading');
        this.hideResults();

        try {
            // First, get the DOM content from the current page
            const domContent = await this.getPageDOM();
            
            const response = await chrome.runtime.sendMessage({
                action: 'crawlPage',
                url: this.currentUrl,
                pageType: pageType,
                domContent: domContent
            });

            if (response.success) {
                this.showStatus('✅ Page load successful!', 'success');
                this.showResults(response.data);
            } else {
                this.showStatus(`❌ ${response.error}`, 'error');
            }
        } catch (error) {
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        }
    }

    async getPageDOM() {
        try {
            // Execute content script to get DOM
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: this.currentTab.id },
                function: () => {
                    return {
                        html: document.documentElement.outerHTML,
                        title: document.title,
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    };
                }
            });
            
            return result.result;
        } catch (error) {
            console.error('Error getting DOM:', error);
            throw new Error('Failed to extract page DOM');
        }
    }

    // ===================== AUTH UI =====================

    setupAuthListeners() {
        // Listen for background auth state updates
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg?.type === 'auth:updated') {
                this.updateAuthUI(msg.state);
            }
        });
    }

    async refreshAuthState() {
        try {
            const res = await chrome.runtime.sendMessage({ action: 'auth:getState' });
            if (res?.success) {
                this.updateAuthUI(res.state);
            }
        } catch (e) {
            // non-fatal
        }
    }

    updateAuthUI(state) {
        this.auth = state || this.auth;
        const statusEl = document.getElementById('authStatus');
        const errorEl = document.getElementById('authError');
        const countdownEl = document.getElementById('expiryCountdown');
        const signInBtn = document.getElementById('authSignInBtn');
        const refreshBtn = document.getElementById('authRefreshBtn');
        const verifyBtn = document.getElementById('authVerifyBtn');
        const signOutBtn = document.getElementById('authSignOutBtn');

        if (!statusEl) return;
        if (errorEl) errorEl.style.display = 'none';

        const user = this.auth?.user;
        const token = this.auth?.token;
        const expiresAt = this.auth?.expiresAt;

        if (token && user) {
            statusEl.textContent = `Signed in as ${user.email || user.name || 'user'}`;
            if (signInBtn) signInBtn.disabled = true;
            if (signOutBtn) signOutBtn.disabled = false;
            if (refreshBtn) refreshBtn.disabled = false;
            if (verifyBtn) verifyBtn.disabled = false;

            if (expiresAt) {
                if (countdownEl) countdownEl.style.display = 'inline';
                this.startCountdown(expiresAt);
            } else {
                if (countdownEl) countdownEl.style.display = 'none';
                this.stopCountdown();
            }
        } else {
            statusEl.textContent = 'Not signed in';
            if (signInBtn) signInBtn.disabled = false;
            if (signOutBtn) signOutBtn.disabled = true;
            if (refreshBtn) refreshBtn.disabled = false; // allow refresh to attempt session-mint
            if (verifyBtn) verifyBtn.disabled = true;
            if (countdownEl) countdownEl.style.display = 'none';
            this.stopCountdown();
        }
    }

    startCountdown(expiresAtIso) {
        const countdownEl = document.getElementById('expiryCountdown');
        this.stopCountdown();
        const update = () => {
            const ms = new Date(expiresAtIso).getTime() - Date.now();
            if (Number.isNaN(ms) || ms <= 0) {
                if (countdownEl) countdownEl.textContent = 'Expired';
                this.stopCountdown();
                return;
            }
            if (countdownEl) countdownEl.textContent = `Expires in ${this.formatDuration(ms)}`;
        };
        update();
        this.countdownId = setInterval(update, 1000);
    }

    stopCountdown() {
        if (this.countdownId) {
            clearInterval(this.countdownId);
            this.countdownId = null;
        }
    }

    setAuthLoading(msg) {
        const errorEl = document.getElementById('authError');
        if (!errorEl) return;
        errorEl.className = 'status loading';
        errorEl.textContent = msg || 'Working…';
        errorEl.style.display = 'block';
    }

    setAuthSuccess(msg) {
        const errorEl = document.getElementById('authError');
        if (!errorEl) return;
        errorEl.className = 'status success';
        errorEl.textContent = msg || 'Success';
        errorEl.style.display = 'block';
        setTimeout(() => { if (errorEl) errorEl.style.display = 'none'; }, 2000);
    }

    setAuthError(msg) {
        const errorEl = document.getElementById('authError');
        if (!errorEl) return;
        errorEl.className = 'status error';
        errorEl.textContent = msg || 'An error occurred';
        errorEl.style.display = 'block';
    }

    formatDuration(ms) {
        const sTotal = Math.floor(ms / 1000);
        const h = Math.floor(sTotal / 3600);
        const m = Math.floor((sTotal % 3600) / 60);
        const s = sTotal % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SpiderPopup();
});
