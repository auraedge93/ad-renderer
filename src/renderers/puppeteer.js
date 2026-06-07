const puppeteer = require('puppeteer');

let browserInstance = null;

// ── Browser pool ──────────────────────────────────────────────────────────────
// Reuse a single browser instance across renders for performance.
// Puppeteer startup is ~1-2s; reusing saves that on every render.

async function getBrowser() {
  if (browserInstance && browserInstance.connected) return browserInstance;

  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',      // critical for Docker/cloud
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--font-render-hinting=none',   // sharper text rendering
      '--disable-web-security',       // allow cross-origin font loading
    ]
  });

  // Clean up on process exit
  process.on('exit', () => browserInstance?.close());
  process.on('SIGINT', () => browserInstance?.close());
  process.on('SIGTERM', () => browserInstance?.close());

  return browserInstance;
}

// ── Main render function ──────────────────────────────────────────────────────

/**
 * Renders an HTML string to a PNG buffer at exact pixel dimensions.
 *
 * @param {string} html - Complete HTML document to render
 * @param {object} options
 * @param {number} options.width  - Canvas width in pixels
 * @param {number} options.height - Canvas height in pixels
 * @returns {{ buffer: Buffer, width: number, height: number }}
 */
async function renderAd(html, { width = 1200, height = 1200 } = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set viewport to exact ad dimensions — no scrollbars, no overflow
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2   // 2x for retina-quality output
    });

    // Load fonts before rendering
    // Google Fonts are injected via @import in the HTML template itself,
    // so we just need to wait for them to load.
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // Wait for all images (hero cutout, logo) to finish loading
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => resolve(); // don't fail on broken images
          }))
      );
    });

    // Extra buffer for web fonts to render
    await new Promise(r => setTimeout(r, 300));

    // Screenshot the exact canvas element (not the full page)
    const canvasEl = await page.$('#ad-canvas');

    const buffer = canvasEl
      ? await canvasEl.screenshot({ type: 'png', omitBackground: false })
      : await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width, height } });

    return { buffer, width, height };

  } finally {
    // Always close the page to free memory; reuse browser
    await page.close();
  }
}

module.exports = { renderAd };
