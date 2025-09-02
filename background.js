// Spider Domain Lookup Chrome Extension - Background Service Worker
class SpiderBackground {
    constructor() {
        this.apiBaseUrl = 'https://spider.neissetrak.ovh';
        this.setupMessageListener();
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
                case 'domainLookup':
                    const domainResult = await this.performDomainLookup(request.domain);
                    sendResponse(domainResult);
                    break;
                
                case 'crawlPage':
                    const crawlResult = await this.performPageCrawl(request);
                    sendResponse(crawlResult);
                    break;
                
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
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
}

// Initialize the background service worker
new SpiderBackground();
