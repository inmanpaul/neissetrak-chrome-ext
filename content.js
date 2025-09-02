// Spider Domain Lookup Chrome Extension - Content Script
// This script runs in the context of web pages

class SpiderContentScript {
    constructor() {
        this.init();
    }

    init() {
        // Listen for messages from the popup/background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        // Add a small indicator to show the extension is active
        this.addExtensionIndicator();
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'getDOM':
                const domData = this.getPageDOM();
                sendResponse({ success: true, data: domData });
                break;
            
            case 'getPageInfo':
                const pageInfo = this.getPageInfo();
                sendResponse({ success: true, data: pageInfo });
                break;
            
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    getPageDOM() {
        return {
            html: document.documentElement.outerHTML,
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            pathname: window.location.pathname,
            timestamp: new Date().toISOString(),
            meta: this.extractMetaData(),
            links: this.extractLinks(),
            images: this.extractImages()
        };
    }

    getPageInfo() {
        return {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            pathname: window.location.pathname,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            timestamp: new Date().toISOString()
        };
    }

    extractMetaData() {
        const meta = {};
        const metaTags = document.querySelectorAll('meta');
        
        metaTags.forEach(tag => {
            const name = tag.getAttribute('name') || tag.getAttribute('property');
            const content = tag.getAttribute('content');
            if (name && content) {
                meta[name] = content;
            }
        });
        
        return meta;
    }

    extractLinks() {
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        linkElements.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#')) {
                links.push({
                    href: href,
                    text: link.textContent.trim(),
                    title: link.getAttribute('title') || ''
                });
            }
        });
        
        return links.slice(0, 100); // Limit to first 100 links
    }

    extractImages() {
        const images = [];
        const imgElements = document.querySelectorAll('img[src]');
        
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                images.push({
                    src: src,
                    alt: img.getAttribute('alt') || '',
                    title: img.getAttribute('title') || '',
                    width: img.width,
                    height: img.height
                });
            }
        });
        
        return images.slice(0, 50); // Limit to first 50 images
    }

    addExtensionIndicator() {
        // Create a small floating indicator that the extension is active
        const indicator = document.createElement('div');
        indicator.id = 'spider-extension-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            z-index: 999999;
            opacity: 0.7;
            cursor: pointer;
            transition: opacity 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        indicator.title = 'Spider Extension Active';
        
        // Show/hide on hover
        indicator.addEventListener('mouseenter', () => {
            indicator.style.opacity = '1';
        });
        
        indicator.addEventListener('mouseleave', () => {
            indicator.style.opacity = '0.7';
        });
        
        // Click to show info
        indicator.addEventListener('click', () => {
            this.showExtensionInfo();
        });
        
        // Only add if it doesn't already exist
        if (!document.getElementById('spider-extension-indicator')) {
            document.body.appendChild(indicator);
        }
    }

    showExtensionInfo() {
        // Remove existing info if present
        const existingInfo = document.getElementById('spider-extension-info');
        if (existingInfo) {
            existingInfo.remove();
            return;
        }

        const info = document.createElement('div');
        info.id = 'spider-extension-info';
        info.style.cssText = `
            position: fixed;
            top: 40px;
            right: 10px;
            width: 300px;
            background: white;
            border-radius: 8px;
            padding: 15px;
            z-index: 999999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;

        const pageInfo = this.getPageInfo();
        info.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">🕷️ Spider Extension</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Domain:</strong> ${pageInfo.domain}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Page:</strong> ${pageInfo.pathname}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Title:</strong> ${pageInfo.title}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                Click the extension icon in the toolbar to perform domain lookups and page analysis.
            </p>
        `;

        document.body.appendChild(info);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (info.parentNode) {
                info.remove();
            }
        }, 5000);
    }
}

// Initialize the content script
new SpiderContentScript();
