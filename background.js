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
                // Enhanced error handling per API contract (headers first, fallback to JSON body)
                let body = null;
                try {
                    body = await response.clone().json();
                } catch (e) {
                    // ignore JSON parse failures
                }

                const headerMsg = response.headers.get('X-User-Message');
                const code = response.headers.get('X-Error-Code');
                const nestId = response.headers.get('X-Nest-Id');
                const statusUrl = response.headers.get('X-Status-Url');
                const reportUrl = response.headers.get('X-Report-Url');

                const userMessage =
                    headerMsg ||
                    (body && (body.user_message || body.message || (body.detail && body.detail.user_message) || (body.detail && body.detail.message))) ||
                    `HTTP ${response.status}`;

                return {
                    success: false,
                    error: userMessage,
                    errorDetails: {
                        code,
                        userMessage,
                        nestId,
                        statusUrl,
                        reportUrl,
                        httpStatus: response.status,
                        body
                    }
                };
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

            // Compute and log payload size before sending
            const body = JSON.stringify(loadPayload);
            try {
                const bytes = new TextEncoder().encode(body).length;
                const mb = bytes / (1024 * 1024);
                console.log(`Spider: sending payload size: ${mb.toFixed(1)}MB (${bytes.toLocaleString()} bytes)`);
            } catch (e) {
                // Fallback in case TextEncoder is unavailable
                console.log(`Spider: sending payload (size unknown): ${body.length} chars`);
            }

            const response = await fetch(`${this.apiBaseUrl}/spider/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body
            });

            if (response.status !== 201) {
                // Enhanced error handling per API contract (headers first, fallback to JSON body)
                let jsonBody = null;
                try {
                    jsonBody = await response.clone().json();
                } catch (e) {
                    // ignore JSON parse failures
                }

                const headerMsg = response.headers.get('X-User-Message');
                const code = response.headers.get('X-Error-Code');
                const nestId = response.headers.get('X-Nest-Id');
                const statusUrl = response.headers.get('X-Status-Url');
                const reportUrl = response.headers.get('X-Report-Url');

                const userMessage =
                    headerMsg ||
                    (jsonBody && (jsonBody.user_message || jsonBody.message || (jsonBody.detail && jsonBody.detail.user_message) || (jsonBody.detail && jsonBody.detail.message))) ||
                    `HTTP ${response.status}: ${response.statusText}`;

                return {
                    success: false,
                    error: userMessage,
                    errorDetails: {
                        code,
                        userMessage,
                        nestId,
                        statusUrl,
                        reportUrl,
                        httpStatus: response.status,
                        body: jsonBody
                    }
                };
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
