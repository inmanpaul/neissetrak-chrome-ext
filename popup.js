// Spider Domain Lookup Chrome Extension - Popup Script
class SpiderPopup {
    constructor() {
        this.currentTab = null;
        this.currentDomain = '';
        this.currentUrl = '';
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        this.updateCurrentDomainDisplay();
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
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SpiderPopup();
});
