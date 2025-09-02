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

