# TagSnap

Retail arbitrage shoe tag scanner for eBay resellers. Snap a photo of a shoe tag, AI reads the style code via OCR, then searches eBay sold listings for comparable sales.

## Setup

**Requirements:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env and paste your Anthropic API key

# 3. Start the server
npm start
```

Open **http://localhost:3000** in your browser (or on your phone at your local IP).

## Usage

1. Tap the camera zone or **SCAN SHOE TAG**
2. Photograph the shoe tag
3. AI identifies the style code
4. Edit the code if needed, or pick from alternate candidates
5. Tap **SEARCH EBAY SOLD** to open eBay sold listings

## Development

```bash
npm run dev   # auto-restarts on file changes (Node 18+ --watch)
```

## Getting an API Key

Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com).
