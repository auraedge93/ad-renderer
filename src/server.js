require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const { renderAd } = require('./renderers/puppeteer');
const { generateTemplate } = require('./templates/engine');
const { validatePayload } = require('./middleware/validate');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// ── In-memory file store (URL mode — avoids OOM in n8n) ──────────────────────
const fileStore = new Map(); // id → { buffer, contentType, createdAt }

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000; // 10 min TTL
  for (const [id, entry] of fileStore) {
    if (entry.createdAt < cutoff) fileStore.delete(id);
  }
}, 60_000);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Max 30 renders per minute.' }
});
app.use('/render', limiter);

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // skip auth if no key configured
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
}

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── GET /file/:id ─────────────────────────────────────────────────────────────
// Serves a rendered image by ID. Files expire after 10 minutes.
app.get('/file/:id', requireApiKey, (req, res) => {
  const entry = fileStore.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'File not found or expired' });
  res.setHeader('Content-Type', entry.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${req.params.id}.png"`);
  res.send(entry.buffer);
});

// ── POST /render ──────────────────────────────────────────────────────────────
// Main render endpoint. Called by n8n after Layout Agent produces its output.
//
// Request body shape:
// {
//   "brand": { brand_name, primary_color, accent_color, bg_color, font_display, font_body, logo_url },
//   "layout": { canvas_width, canvas_height, template, safe_zone_padding, ... },
//   "copy": { headline, subheadline, body_copy, cta_text, tagline },
//   "hero_image_url": "https://...",   // cutout PNG from Recraft/Ideogram
//   "creative_direction": { concept, visual_style, color_primary, color_accent, ... },
//   "format": "1:1" | "9:16" | "1.91:1"  // optional override
// }
//
// Response:
// { "image_base64": "...", "image_url": "...", "width": 1200, "height": 1200, "format": "png" }
//
app.post("/render", requireApiKey, validatePayload, async (req, res) => {
  res.setTimeout(90000);
  const startTime = Date.now();

  try {
    const { brand, layout, copy, hero_image_url, creative_direction, format } = req.body;

    // 1. Generate HTML template from design package
    const html = generateTemplate({
      brand,
      layout,
      copy,
      hero_image_url,
      creative_direction,
      format
    });

    // 2. Render via Puppeteer → PNG buffer
    const { buffer, width, height } = await renderAd(html, {
      width: layout.canvas_width || 1080,
      height: layout.canvas_height || 1080
    });

    // 3. Store buffer and return a URL — avoids sending large binary through n8n memory
    const fileId = randomUUID();
    fileStore.set(fileId, { buffer, contentType: 'image/png', createdAt: Date.now() });
    const baseUrl = process.env.RENDERER_BASE_URL || `https://${req.headers.host}`;

    res.json({
      success: true,
      url: `${baseUrl}/file/${fileId}`,
      image_url: `${baseUrl}/file/${fileId}`,
      fileId,
      width,
      height,
      format: 'png',
      expires_in: '10 minutes',
      render_time_ms: Date.now() - startTime
    });

  } catch (err) {
    console.error('[render] Error:', err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      render_time_ms: Date.now() - startTime
    });
  }
});

// ── POST /render/variants ─────────────────────────────────────────────────────
// Format Variant Agent endpoint.
// Takes an approved design package and produces all platform sizes in one call.
//
// Request body: same as /render, plus:
// { "variants": ["1:1", "9:16", "1.91:1"] }  // optional, defaults to all
//
app.post("/render", requireApiKey, validatePayload, async (req, res) => {
  res.setTimeout(90000);
  const startTime = Date.now();

  const PLATFORM_VARIANTS = [
    { name: 'facebook_feed',        width: 1200, height: 1200, ratio: '1:1'     },
    { name: 'facebook_story',       width: 1080, height: 1920, ratio: '9:16'    },
    { name: 'instagram_post',       width: 1080, height: 1080, ratio: '1:1'     },
    { name: 'instagram_story',      width: 1080, height: 1920, ratio: '9:16'    },
    { name: 'instagram_landscape',  width: 1080, height: 566,  ratio: '1.91:1'  },
    { name: 'linkedin_post',        width: 1200, height: 627,  ratio: '1.91:1'  },
    { name: 'twitter_x',            width: 1600, height: 900,  ratio: '16:9'    },
    { name: 'tiktok',               width: 1080, height: 1920, ratio: '9:16'    }
  ];

  const requestedRatios = req.body.variants || null;
  const targets = requestedRatios
    ? PLATFORM_VARIANTS.filter(v => requestedRatios.includes(v.ratio))
    : PLATFORM_VARIANTS;

  try {
    const results = {};

    for (const variant of targets) {
      const { brand, layout, copy, hero_image_url, creative_direction } = req.body;

      // Adapt layout for this variant's dimensions
      const adaptedLayout = adaptLayoutForVariant(layout, variant);

      const html = generateTemplate({
        brand,
        layout: adaptedLayout,
        copy,
        hero_image_url,
        creative_direction,
        format: variant.ratio
      });

      const { buffer } = await renderAd(html, {
        width: variant.width,
        height: variant.height
      });

      results[variant.name] = {
        platform: variant.name,
        width: variant.width,
        height: variant.height,
        ratio: variant.ratio,
        image_base64: buffer.toString('base64'),
        image_data_url: `data:image/png;base64,${buffer.toString('base64')}`
      };
    }

    res.json({
      success: true,
      variants: results,
      count: Object.keys(results).length,
      render_time_ms: Date.now() - startTime
    });

  } catch (err) {
    console.error('[render/variants] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /render/patch ────────────────────────────────────────────────────────
// Surgical revision endpoint. Called when Design Critic scores < 8.
// Only re-renders the CSS/HTML for failing dimensions — does not regenerate the hero image.
//
// Request body:
// {
//   ...full design package...
//   "failing_dimensions": ["typography", "cta_clarity"],
//   "specific_fixes": {
//     "typography": "Increase headline weight to 800. Reduce body to 11px.",
//     "cta_clarity": "Change CTA bg to brand primary. Increase padding."
//   }
// }
//
app.post("/render", requireApiKey, validatePayload, async (req, res) => {
  res.setTimeout(90000);
  const startTime = Date.now();

  try {
    const { brand, layout, copy, hero_image_url, creative_direction, failing_dimensions, specific_fixes } = req.body;

    // Apply surgical CSS patches based on failing dimensions
    const patchedLayout = applyDimensionPatches(layout, failing_dimensions, specific_fixes, brand);

    const html = generateTemplate({
      brand,
      layout: patchedLayout,
      copy,
      hero_image_url,
      creative_direction,
      patches: { failing_dimensions, specific_fixes }
    });

    const { buffer, width, height } = await renderAd(html, {
      width: patchedLayout.canvas_width || 1200,
      height: patchedLayout.canvas_height || 1200
    });

    const fileId = randomUUID();
    fileStore.set(fileId, { buffer, contentType: 'image/png', createdAt: Date.now() });
    const baseUrl = process.env.RENDERER_BASE_URL || `https://${req.headers.host}`;

    res.json({
      success: true,
      url: `${baseUrl}/file/${fileId}`,
      image_url: `${baseUrl}/file/${fileId}`,
      fileId,
      width,
      height,
      format: 'png',
      patches_applied: failing_dimensions,
      expires_in: '10 minutes',
      render_time_ms: Date.now() - startTime
    });

  } catch (err) {
    console.error('[render/patch] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function adaptLayoutForVariant(layout, variant) {
  const adapted = { ...layout, canvas_width: variant.width, canvas_height: variant.height };

  // 9:16 vertical — restack layout, hero goes top, copy block below
  if (variant.ratio === '9:16') {
    adapted.template = 'vertical';
    adapted.hero_asset_position = 'top-center';
    adapted.headline_position = 'below-hero';
    adapted.cta_position = 'bottom-center';
    adapted.safe_zone_padding = '80px';
    adapted.headline_font_size = scaleFont(layout.headline_font_size, 0.85);
  }

  // 1.91:1 landscape — compress vertical, tighten fonts
  if (variant.ratio === '1.91:1') {
    adapted.template = 'landscape';
    adapted.hero_asset_position = 'right-center';
    adapted.headline_position = 'left-center';
    adapted.cta_position = 'left-bottom';
    adapted.safe_zone_padding = '48px';
    adapted.headline_font_size = scaleFont(layout.headline_font_size, 0.7);
  }

  // 16:9 — similar to landscape but wider
  if (variant.ratio === '16:9') {
    adapted.template = 'landscape';
    adapted.hero_asset_position = 'right-center';
    adapted.headline_position = 'left-center';
    adapted.cta_position = 'left-bottom';
    adapted.safe_zone_padding = '60px';
    adapted.headline_font_size = scaleFont(layout.headline_font_size, 0.75);
  }

  return adapted;
}

function scaleFont(fontSizeStr, scale) {
  if (!fontSizeStr) return fontSizeStr;
  const match = fontSizeStr.match(/^(\d+(?:\.\d+)?)(px|rem|em|pt)$/);
  if (!match) return fontSizeStr;
  return `${Math.round(parseFloat(match[1]) * scale)}${match[2]}`;
}

function applyDimensionPatches(layout, failingDimensions, specificFixes, brand) {
  const patched = { ...layout, patches: {} };

  for (const dimension of (failingDimensions || [])) {
    const fix = specificFixes?.[dimension] || '';

    switch (dimension) {
      case 'typography': {
        // Parse fix instructions for font-size/weight changes
        if (fix.match(/800|bold|heavy/i)) patched.patches.headlineFontWeight = '800';
        if (fix.match(/700/i))            patched.patches.headlineFontWeight = '700';
        if (fix.match(/body.*11px/i))     patched.patches.bodyFontSize = '11px';
        if (fix.match(/body.*12px/i))     patched.patches.bodyFontSize = '12px';
        if (fix.match(/headline.*smaller|reduce headline/i)) {
          patched.patches.headlineFontSize = scaleFont(layout.headline_font_size, 0.85);
        }
        if (fix.match(/headline.*larger|increase headline/i)) {
          patched.patches.headlineFontSize = scaleFont(layout.headline_font_size, 1.15);
        }
        break;
      }
      case 'cta_clarity': {
        // Make CTA more prominent
        patched.patches.ctaBgColor = brand?.primary_color || '#10B981';
        patched.patches.ctaFontWeight = '700';
        patched.patches.ctaPaddingX = '40px';
        patched.patches.ctaPaddingY = '18px';
        if (fix.match(/larger|bigger|increase/i)) patched.patches.ctaFontSize = '18px';
        break;
      }
      case 'color_harmony': {
        // Re-assert brand colors
        patched.patches.forceRebrand = true;
        break;
      }
      case 'visual_hierarchy': {
        // Increase headline dominance
        patched.patches.headlineFontSize = scaleFont(layout.headline_font_size, 1.1);
        patched.patches.headlineFontWeight = '800';
        patched.patches.subheadlineOpacity = '0.85';
        break;
      }
      case 'composition_balance': {
        patched.patches.safeZonePadding = '80px';
        patched.patches.elementSpacing = 'generous';
        break;
      }
    }
  }

  return patched;
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[ad-renderer] Running on port ${PORT}`);
});
