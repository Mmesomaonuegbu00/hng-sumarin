# Sumarin - AI Page Summarizer Chrome Extension

An AI-powered Chrome extension that extracts content from web pages, summarizes it using Groq's LLaMA model, and provides key takeaways with optional in-page highlighting and history tracking.

## Features

- **Content Extraction**: Intelligently extracts readable content from articles, avoiding navigation and ads.
- **AI Summarization**: Uses Groq API with LLaMA 3.1-8B for fast, accurate summaries.
- **Structured Output**: Displays bullet-point takeaways, reading time, word count, and quality score.
- **In-Page Highlighting**: Highlights key sentences directly on the webpage. on hold
- **History Tracking**: Saves summaries per URL to prevent duplicates and allow quick access.
- **User Settings**: Configurable max history items (default: 50).
- **Responsive UI**: Clean, accessible popup with tabs for summary, highlights, and history.

## Architecture

### Extension Structure
- **Popup UI** (`index.html` + `main.js`): Handles user interaction, displays results, manages tabs.
- **Background Service Worker** (`background.js`): Proxies API requests to the summarization server.
- **Content Script** (`content.js`): Extracts page content and applies highlights.
- **API Server** (`../sumarin-main`): Next.js API route using Groq for AI summarization.

### Data Flow
1. User clicks "Summarize Page".
2. Content script extracts text from active tab.
3. Popup checks local storage for existing summary (prevents duplicates).
4. If not cached, sends data to background worker.
5. Background fetches AI summary from API server.
6. Popup displays results and caches in `chrome.storage.local`.

### Security
- API keys stored server-side only (no client exposure).
- Content sanitized to prevent XSS.
- Minimal permissions: `activeTab`, `storage`, `tabs`, `scripting`.
- Host permissions limited to API endpoint and HTTPS sites.

## Setup Instructions

### Prerequisites
- Node.js 18+
- Chrome browser
- Groq API key

### Extension Setup
1. Clone the repository.
2. Navigate to `sumarin-extension`:
   ```bash
   cd sumarin-extension
   npm install
   npm run build
   ```
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `sumarin-extension/dist` folder (after build)

### API Server Setup
1. Navigate to `sumarin-main`:
   ```bash
   cd ../sumarin-main
   npm install
   ```
2. Set environment variable:
   ```bash
   export GROQ_API_KEY=your_groq_api_key_here
   ```
3. Run the server:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3000`.

### Usage
1. Open a webpage in Chrome.
2. Click the Sumarin extension icon.
3. Click "Summarize Page".
4. View takeaways in the Summary tab.
5. Optionally highlight key points on the page.
6. Access past summaries in the History tab.

## AI Integration

- **Provider**: Groq (fast inference via LLaMA 3.1-8B Instant).
- **Prompt**: Structured JSON output for title, summary bullets, reading time, and score.
- **Security**: API calls routed through background worker to server-side endpoint.
- **Rate Limiting**: Not implemented (can be added via API quotas).

## Trade-offs

- **Local API Server**: Requires running a separate server for dev; for production, deploy to Vercel and update `API_ENDPOINT` in `background.js`.
- **Content Extraction**: Heuristic-based; may miss edge cases on non-standard sites.
- **Storage**: Uses `chrome.storage.local` (limited to ~10MB); no cloud sync.
- **Performance**: Lightweight, but AI calls add latency (mitigated by caching).
- **Accessibility**: Basic ARIA support; no screen reader testing.

## Development

- **Build**: `npm run build` (Vite bundles to `dist`).
- **Manifest**: V3 compliant with service worker and content scripts.
- **Testing**: Manual testing on article sites; no automated tests.
- **Contributing**: Ensure changes maintain security and UX standards.

## License

MIT License.