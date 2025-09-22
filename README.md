# 🕷️ Chrome Spider Extension

A powerful Chrome extension for domain lookups and page analysis using the Spider API. This extension allows you to perform domain lookups and crawl web pages with full DOM analysis directly from your browser.

## ✨ Features

- **Domain Lookup**: Look up domains in the Spider database
- **Page Loading**: Load current pages with full DOM extraction
- **Page Type Detection**: Support for Homepage, Product Listing (PLP), and Product Page (PDP)
- **Modern UI**: Beautiful, responsive interface with gradient design
- **Real-time Analysis**: Get instant results from the Spider API
- **Visual Indicators**: Small floating indicator shows when extension is active

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your extensions list

### Method 2: Package Extension (Distribution)

```bash
# Build the extension package
npm run package

# This creates chrome-spider.zip which can be distributed
```

## 📖 Usage

### Domain Lookup

1. Navigate to any website
2. Click the Spider extension icon in your browser toolbar
3. The current domain will be automatically detected
4. Click "🔍 Domain Lookup" to check if the domain exists in the Spider database
5. View results in the popup

### Page Loading

1. Navigate to the page you want to analyze
2. Click the Spider extension icon
3. Select the page type:
   - **Homepage**: Main landing page
   - **Product Listing (PLP)**: Category/product listing pages
   - **Product Page (PDP)**: Individual product pages
4. Click "🕷️ Load Page" to initiate the page load
5. The extension will extract the full DOM and send it to the Spider API
6. View load results and status

### Visual Indicators

- A small floating indicator appears on web pages when the extension is active
- Click the indicator to see current page information
- The indicator shows domain, page path, and title

## 🔧 API Integration

This extension integrates with the Spider API at `https://spider.neissetrak.ovh`:

### Endpoints Used

- `GET /spider/domain-lookup` - Domain lookup functionality
- `POST /spider/load` - Page loading with DOM data
- `GET /spider/report/{nest_id}` - Retrieve load reports

### Page Types Supported

- `homepage` - Main landing pages
- `product_listing` - Product listing/category pages (PLP)
- `product_page` - Individual product pages (PDP)

## 🏗️ Architecture

### Files Structure

```
chrome-spider/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── content.js            # Content script for DOM extraction
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── package.json          # Project configuration
└── README.md            # This file
```

### Key Components

- **Popup**: Modern UI with gradient design and responsive layout
- **Background Service Worker**: Handles API calls and data storage
- **Content Script**: Extracts DOM data and provides page information
- **Manifest V3**: Latest Chrome extension manifest format

## 🛠️ Development

### Prerequisites

- Chrome browser (version 88+)
- Node.js (optional, for packaging)

### Building

```bash
# Install dependencies (if any)
npm install

# Build the extension
npm run build

# Package for distribution
npm run package

# Clean build artifacts
npm run clean
```

### Testing

1. Load the extension in Chrome using "Load unpacked"
2. Navigate to various websites
3. Test domain lookups and page crawling
4. Verify API integration works correctly

## 🔒 Permissions

The extension requires the following permissions:

- `activeTab`: Access to the currently active tab
- `storage`: Store crawl data locally
- `scripting`: Execute scripts in web pages
- `https://spider.neissetrak.ovh/*`: Access to Spider API

## 🎨 UI Features

- **Gradient Background**: Beautiful purple gradient design
- **Glass Morphism**: Modern glass-like UI elements
- **Responsive Layout**: Adapts to different screen sizes
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Clear error messages and status indicators

## 📝 API Response Examples

### Domain Lookup Response

```json
{
  "success": true,
  "data": {
    "domain": "example.com",
    "exists": true,
    "pdp_urls": ["https://example.com/product/123"],
    "plp_urls": ["https://example.com/category/electronics"],
    "rate_limit_delay": 1000
  }
}
```

### Page Load Response

```json
{
  "success": true,
  "data": {
    "run_id": "abc123",
    "status": "completed",
    "total_score": 85.5,
    "data_id": "def456",
    "message": "Page load initiated for homepage",
    "url": "https://example.com"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Verify the Spider API is accessible
3. Ensure all permissions are granted
4. Try reloading the extension

## 🔄 Updates

To update the extension:

1. Download the latest version
2. Remove the old extension from Chrome
3. Load the new version using "Load unpacked"
4. Or install the packaged version

---

**Built with ❤️ for web analysis and domain research**


## 🔐 Auth Bridge (MV3) with NextAuth v5 Backend

This extension now integrates an authentication handshake with your Next.js backend (NextAuth v5). If the user is already logged in on the website, the extension will mint an extension-scoped JWT via the backend and refresh it automatically. A popup UI shows logged-in status, with options to sign in, refresh, verify, and sign out.

### Backend assumptions
- Routes exist in your Next.js app:
  - Auth/mint token: [`route.ts`](src/app/api/extension/auth/route.ts)
  - Verify token: [`route.ts`](src/app/api/extension/verify/route.ts)
  - Me via bearer/session: [`route.ts`](src/app/api/extension/me/route.ts)
  - NextAuth cookie config enabling SameSite=None: [`config.ts`](src/server/auth/config.ts)
  - NextAuth server export (session lookup): [`index.ts`](src/server/auth/index.ts)
- Env variables used by backend (see [`env.js`](src/env.js)):
  - EXTENSION_ALLOWED_ORIGINS
  - EXTENSION_JWT_SECRET
  - EXTENSION_JWT_TTL_SECONDS

### Files added/updated in this extension
- Runtime config: [`env.js`](env.js)
- API client: [`api.js`](api.js)
- Background auth lifecycle and messaging: [`background.js`](background.js)
- Popup UI additions for auth: [`popup.html`](popup.html), [`popup.js`](popup.js)
- Manifest permissions for refresh scheduling: [`manifest.json`](manifest.json)

### Configuration
- Base URL is set to your app domain in [`env.js`](env.js): `APP_BASE_URL = https://spider.neissetrak.ovh`
- Auth paths in [`env.js`](env.js):
  - AUTH_STATUS_MINT: `/api/extension/auth`
  - VERIFY: `/api/extension/verify`
  - ME: `/api/extension/me`
  - SIGNIN_UI: `/api/auth/signin`
  - SIGNOUT_UI: `/api/auth/signout`
- Manifest permissions (added):
  - "alarms" for token refresh scheduling
  - Host permissions already include `https://spider.neissetrak.ovh/*`

### How it works
- On install/startup:
  - Background service worker calls GET `/api/extension/auth` with `credentials: 'include'`.
  - If authenticated, stores `{ token, user, expiresAt }` in `chrome.storage.local` and schedules a refresh alarm for 60 seconds before expiry.
  - If not authenticated, state is cleared and a backoff timer is scheduled (exponential up to 15 minutes).
- Token refresh:
  - When the "refresh-token" alarm fires, the background tries again to mint a token via the same GET `/api/extension/auth` credentials flow.
- Verify token (dev):
  - Popup "Verify" triggers POST `/api/extension/verify { token }`.
- Me endpoint (available in API client for future use):
  - GET `/api/extension/me` using Bearer, or with credentials include.

### Storage schema (chrome.storage.local)
- `token: string`
- `expiresAt: ISO string`
- `user: { id, name, email, image? }`
- `lastVerifiedAt?: ISO string`

### Popup ↔ Background messaging
- `auth:getState` → returns current auth state
- `auth:login` → opens NextAuth sign-in UI and polls `/api/extension/auth` for up to 60s
- `auth:refresh` → immediate auth attempt via `/api/extension/auth`
- `auth:verify` → verifies the current token via `/api/extension/verify`
- `auth:logout` → clears local token, opens NextAuth sign-out page

Background broadcasts updates with `type: 'auth:updated'`, which the popup listens to and updates the UI.

### Acceptance criteria checklist
- First run:
  - When logged in on site: background mints token and popup shows "Signed in as email".
  - When logged out: popup shows "Sign in"; after sign-in on the site, the extension detects auth during polling and stores the token automatically.
- Steady state:
  - Refresh scheduled before expiry; token updated without user action.
  - Verify shows valid for non-expired token.
- Error state:
  - If backend returns `{ authenticated: false }`, token is cleared and popup shows "Not signed in".
  - Network/CORS errors appear in popup status area and are retried later via backoff.

### Testing
1. Backend configuration:
   - Ensure `EXTENSION_ALLOWED_ORIGINS` includes `chrome-extension://&lt;your-extension-id&gt;`
   - NextAuth cookies must be `SameSite=None; Secure` (see [`config.ts`](src/server/auth/config.ts))
2. Extension configuration:
   - Set `APP_BASE_URL` in [`env.js`](env.js) (already set to `https://spider.neissetrak.ovh`)
3. Load unpacked:
   - Open `chrome://extensions`, enable Developer Mode, load this folder.
4. Verify flows:
   - Logged out on site → popup shows "Sign in"
   - After logging in on site → popup auto-updates during polling or via "Refresh"
   - Token auto-refreshes before expiry (check extension logs: chrome://extensions → "service worker" console)
   - "Verify" validates the token via `/api/extension/verify`
   - `/api/extension/me` (Bearer) is available in [`api.js`](api.js)

### Notes
- No external libraries were added.
- Background uses `importScripts('env.js', 'api.js')` to load shared modules.
- Service worker uses only MV3-compatible APIs (`storage`, `alarms`, `tabs`, `runtime` messaging).
