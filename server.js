require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('API KEY CHECK:', process.env.ANTHROPIC_API_KEY ? 'FOUND' : 'MISSING');

const PROMPT = `You are helping an eBay shoe reseller find the style code on a shoe tag. This code is what they'll search on eBay sold listings.

BRAND-SPECIFIC PATTERNS — memorize these:

NIKE:
- Format: 2 letters + 4 digits + dash + 3 digits: CZ5594-100, DZ5485-612, FD2596-001, BQ6472-101
- Less common: 6 digits + dash + 3 digits: 544331-001, 302370-161
- The last 3 digits after the dash are the colorway code
- Usually printed near or below a barcode

ADIDAS:
- Format: 2-3 letters + 4 digits: JS4945, GW3811, HQ4272, GX5794, EG2441
- Almost always exactly 6 characters total
- Sometimes starts with 3 letters

NEW BALANCE:
- Format: letter + 3-4 digits + letters: M990GL6, U9060EGB

OTHER BRANDS: Look for codes labeled "Style No.", "Art. No.", "SKU", "Item", or near a barcode.

IMPORTANT TIPS:
- Tags often have MANY numbers (size, width, barcode number, country code) — don't confuse these with the style code
- The style code is usually the most prominent alphanumeric code on the tag
- Barcode numbers (long strings of 10-13 digits) are NOT style codes
- Size numbers (8, 9, 10, 10.5 etc) are NOT style codes

Scan the entire tag. Find ALL possible style codes. Return your best guess plus alternatives.

Respond ONLY with raw JSON, no markdown:
{
  "style_code": "best match style code",
  "candidates": ["other_code_1", "other_code_2"],
  "brand": "Nike or Adidas or New Balance or Unknown",
  "analysis": "One sentence: what you see and why you picked this code."
}`;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/analyze', async (req, res) => {
  const { imageB64 } = req.body;
  if (!imageB64) {
    return res.status(400).json({ error: 'imageB64 is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 }
            },
            {
              type: 'text',
              text: PROMPT
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({
        error: err.error?.message || `Anthropic API error ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);

    // Strip "A:" or bare "A" prefix that Adidas tags sometimes produce
    // Adidas codes are always 6 chars, so a 7-char code starting with A = mislabeled prefix
    const cleanCode = (c, brand) => {
      if (!c) return c;
      c = c.replace(/^A:\s*/i, '').trim(); // strip "A:" with colon
      if (brand && brand.toLowerCase().includes('adidas') && c.length === 7 && /^A/i.test(c))
        c = c.slice(1); // strip bare "A" prefix on Adidas codes
      return c;
    };
    parsed.style_code = cleanCode(parsed.style_code, parsed.brand);
    parsed.candidates = (parsed.candidates || []).map(c => cleanCode(c, parsed.brand));

    res.json(parsed);
  } catch (err) {
    console.error('Error calling Anthropic API:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`TagSnap running on http://localhost:${PORT}`);
});
