/**
 * Ad Template Engine
 *
 * Converts the design package JSON (from the n8n Layout Agent) into a
 * complete, self-contained HTML document that Puppeteer can screenshot.
 *
 * Templates:
 *   square    - 1:1 (Facebook Feed, Instagram Post)
 *   vertical  - 9:16 (Stories, TikTok)
 *   landscape - 1.91:1 / 16:9 (LinkedIn, Twitter/X)
 *
 * Design approach:
 *   - CSS custom properties for all brand tokens
 *   - Absolute positioning for pixel-perfect placement
 *   - All text rendered in HTML/CSS (never in the image layer)
 *   - Hero asset is a composited <img> (the Recraft/Ideogram cutout)
 *   - Google Fonts loaded via @import from approved font pack
 */

const { getFontTokens, buildGoogleFontsImport } = require('./fonts');

/**
 * @param {object} params
 * @param {object} params.brand              - Brand memory object
 * @param {object} params.layout             - Layout Agent output
 * @param {object} params.copy               - Copywriter Agent output
 * @param {string} params.hero_image_url     - Hero asset PNG (with/without bg)
 * @param {object} params.creative_direction - Creative Director output
 * @param {string} [params.format]           - Ratio hint: '1:1', '9:16', '1.91:1'
 * @param {object} [params.patches]          - Surgical revision overrides
 * @returns {string} Complete HTML document
 */
function generateTemplate({ brand, layout, copy, hero_image_url, creative_direction, format, patches }) {

  // ── 1. Detect font category from brief + creative direction ─────────────────
  const briefText = `${brand?.industry || ''} ${creative_direction?.concept || ''} ${layout?.template || ''}`;
  const conceptText = creative_direction?.concept || '';
  const fontCategory = brand?.font_category || layout?.font_category || 'default';
  const fontTokens = getFontTokens(fontCategory !== 'default' ? fontCategory : briefText, conceptText);

  // ── 2. Resolve brand tokens ─────────────────────────────────────────────────
  const tokens = resolveBrandTokens(brand, creative_direction, layout, patches, fontTokens);

  // ── 3. Pick template based on ratio / dimensions ────────────────────────────
  const ratio = format || inferRatio(layout.canvas_width, layout.canvas_height);
  const templateFn = ratio === '9:16' ? verticalTemplate
    : ratio === '1.91:1' || ratio === '16:9' ? landscapeTemplate
    : squareTemplate;

  // ── 4. Resolve copy with character limit enforcement ────────────────────────
  const safeCopy = enforceCopyLimits(copy, layout);

  // ── 5. Resolve patch overrides ──────────────────────────────────────────────
  const resolvedLayout = { ...layout, ...(patches?.specific_fixes ? {} : {}), ...(layout.patches || {}) };

  // ── 6. Build HTML ───────────────────────────────────────────────────────────
  return buildDocument({
    tokens,
    copy: safeCopy,
    layout: resolvedLayout,
    hero_image_url,
    templateFn,
    fontTokens,
    width: layout.canvas_width || 1200,
    height: layout.canvas_height || 1200
  });
}

// ── Token resolver ────────────────────────────────────────────────────────────

function resolveBrandTokens(brand, creative, layout, patches, fontTokens) {
  const p = patches || {};
  const ft = fontTokens || {};

  // Font resolution: brand override > font pack display > creative direction > fallback
  const resolvedDisplayFont = brand?.font_display || ft.display || creative?.typography_heading || 'Plus Jakarta Sans';
  const resolvedBodyFont    = brand?.font_body    || ft.body   || creative?.typography_body    || 'Montserrat';
  const resolvedAccentFont  = brand?.font_accent  || ft.accent || 'Dancing Script';

  return {
    colorPrimary:        p.forceRebrand ? (brand?.primary_color   || creative?.color_primary  || '#0D1B2A') : (brand?.primary_color   || creative?.color_primary  || '#0D1B2A'),
    colorAccent:         p.ctaBgColor   || (brand?.accent_color    || creative?.color_accent   || '#D4AF37'),
    colorBg:             brand?.bg_color          || creative?.color_bg           || '#FFFFFF',
    colorText:           brand?.text_color        || '#FFFFFF',
    colorTextDark:       brand?.text_color_dark   || '#0D1B2A',
    fontDisplay:         resolvedDisplayFont,
    fontDisplayStack:    ft.displayStack || `"${resolvedDisplayFont}", serif`,
    fontBody:            resolvedBodyFont,
    fontBodyStack:       ft.bodyStack    || `"${resolvedBodyFont}", sans-serif`,
    fontAccent:          resolvedAccentFont,
    fontAccentStack:     ft.accentStack  || `"${resolvedAccentFont}", cursive`,
    fontWeightDisplay:   ft.weights?.display || '800',
    fontWeightBody:      ft.weights?.body    || '400',
    logoUrl:             brand?.logo_url          || null,
    headlineFontSize:    p.headlineFontSize || layout?.headline_font_size || '64px',
    headlineFontWeight:  p.headlineFontWeight || ft.weights?.display || '800',
    bodyFontSize:        p.bodyFontSize || '14px',
    ctaBgColor:          p.ctaBgColor   || brand?.accent_color || creative?.color_accent || '#D4AF37',
    ctaFontWeight:       p.ctaFontWeight || '700',
    ctaPaddingX:         p.ctaPaddingX  || '36px',
    ctaPaddingY:         p.ctaPaddingY  || '16px',
    ctaFontSize:         p.ctaFontSize  || '15px',
    safeZone:            p.safeZonePadding || layout?.safe_zone_padding || '60px',
    elementSpacing:      p.elementSpacing === 'generous' ? '28px' : '20px',
  };
}

// ── Copy limit enforcement ────────────────────────────────────────────────────

function enforceCopyLimits(copy, layout) {
  const limits = {
    headline:     layout?.headline_slot?.max_chars    || 40,
    subheadline:  layout?.subheadline_slot?.max_chars || 80,
    body_copy:    layout?.body_copy_slot?.max_chars   || 120,
    cta_text:     layout?.cta_slot?.max_chars         || 24,
    tagline:      60
  };

  const safe = {};
  for (const [key, val] of Object.entries(copy || {})) {
    safe[key] = truncate(val, limits[key] || 200);
  }
  return safe;
}

function truncate(str, maxChars) {
  if (!str || str.length <= maxChars) return str || '';
  // Break at word boundary
  const trimmed = str.slice(0, maxChars);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > maxChars * 0.6 ? trimmed.slice(0, lastSpace) + '…' : trimmed + '…';
}

// ── Ratio inference ───────────────────────────────────────────────────────────

function inferRatio(w, h) {
  if (!w || !h) return '1:1';
  const r = w / h;
  if (r < 0.7)  return '9:16';
  if (r > 1.4)  return '1.91:1';
  return '1:1';
}

// ── Document shell ────────────────────────────────────────────────────────────

function buildDocument({ tokens, copy, layout, hero_image_url, templateFn, fontTokens, width, height }) {
  const cssVars = buildCssVars(tokens);
  const googleFontsUrl = fontTokens ? buildGoogleFontsImport(fontTokens) : buildFallbackGoogleFontsUrl(tokens);
  const bodyHtml = templateFn({ tokens, copy, layout, hero_image_url, width, height });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <style>
    @import url('${googleFontsUrl}');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
${cssVars}
    }

    html, body {
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: var(--color-bg);
    }

    #ad-canvas {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background: var(--color-bg);
      font-family: var(--font-body), sans-serif;
    }

    /* ── Typography system ── */
    .headline {
      font-family: var(--font-display);
      font-size: var(--headline-font-size);
      font-weight: var(--headline-font-weight);
      line-height: 1.05;
      letter-spacing: -0.02em;
      color: var(--color-text);
    }

    .subheadline {
      font-family: var(--font-body);
      font-size: var(--body-font-size);
      font-weight: 400;
      line-height: 1.5;
      color: var(--color-text);
      opacity: 0.88;
    }

    .body-copy {
      font-family: var(--font-body);
      font-size: calc(var(--body-font-size) * 0.9);
      font-weight: var(--font-weight-body);
      line-height: 1.6;
      color: var(--color-text);
      opacity: 0.75;
    }

    .tagline {
      font-family: var(--font-body);
      font-size: calc(var(--body-font-size) * 0.8);
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-accent);
    }

    .script-accent {
      font-family: var(--font-accent);
      font-size: calc(var(--body-font-size) * 1.4);
      font-weight: 600;
      color: var(--color-text);
      opacity: 0.9;
    }

    .info-badge {
      display: inline-block;
      background: var(--cta-bg-color);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 700;
      padding: 6px 16px;
      border-radius: 100px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    /* ── CTA button ── */
    .cta-btn {
      display: inline-block;
      background: var(--cta-bg-color);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--cta-font-size);
      font-weight: var(--cta-font-weight);
      padding: var(--cta-padding-y) var(--cta-padding-x);
      border-radius: 100px;
      letter-spacing: 0.01em;
      white-space: nowrap;
      text-decoration: none;
    }

    /* ── Logo ── */
    .brand-logo {
      max-width: 120px;
      max-height: 40px;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }

    /* ── Hero image ── */
    .hero-asset {
      object-fit: cover;
      object-position: center top;
    }

    /* ── Decorative elements ── */
    .blob {
      border-radius: 50%;
      position: absolute;
      opacity: 0.15;
    }

    .accent-bar {
      width: 48px;
      height: 4px;
      background: var(--color-accent);
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div id="ad-canvas">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function buildCssVars(tokens) {
  return Object.entries({
    '--color-primary':         tokens.colorPrimary,
    '--color-accent':          tokens.colorAccent,
    '--color-bg':              tokens.colorBg,
    '--color-text':            tokens.colorText,
    '--color-text-dark':       tokens.colorTextDark,
    '--font-display':          tokens.fontDisplayStack || `"${tokens.fontDisplay}", serif`,
    '--font-body':             tokens.fontBodyStack    || `"${tokens.fontBody}", sans-serif`,
    '--font-accent':           tokens.fontAccentStack  || `"${tokens.fontAccent}", cursive`,
    '--font-weight-display':   tokens.fontWeightDisplay || '800',
    '--font-weight-body':      tokens.fontWeightBody    || '400',
    '--headline-font-size':    tokens.headlineFontSize,
    '--headline-font-weight':  tokens.headlineFontWeight,
    '--body-font-size':        tokens.bodyFontSize,
    '--cta-bg-color':          tokens.ctaBgColor,
    '--cta-font-weight':       tokens.ctaFontWeight,
    '--cta-padding-x':         tokens.ctaPaddingX,
    '--cta-padding-y':         tokens.ctaPaddingY,
    '--cta-font-size':         tokens.ctaFontSize,
    '--safe-zone':             tokens.safeZone,
    '--element-spacing':       tokens.elementSpacing,
  }).map(([k, v]) => `      ${k}: ${v};`).join('\n');
}

// Fallback Google Fonts URL when no font pack is detected
function buildFallbackGoogleFontsUrl(tokens) {
  const families = [tokens.fontDisplay, tokens.fontBody]
    .filter(Boolean)
    .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── Template: Square 1:1 ──────────────────────────────────────────────────────
// Used for: Facebook Feed, Instagram Post
// Layout: headline top, hero bottom-left, copy mid-right, CTA bottom-center

function squareTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const heroH = Math.round(height * 0.58);
  const heroW = Math.round(width * 0.65);
  const contentTop = Math.round(height * 0.08);

  return `
    <!-- Background gradient overlay -->
    <div style="
      position: absolute; inset: 0;
      background: linear-gradient(
        160deg,
        ${tokens.colorPrimary} 0%,
        ${darken(tokens.colorPrimary, 20)} 60%,
        ${tokens.colorPrimary} 100%
      );
    "></div>

    <!-- Decorative blobs -->
    <div class="blob" style="
      width: ${Math.round(width * 0.55)}px; height: ${Math.round(width * 0.55)}px;
      background: ${tokens.colorAccent};
      bottom: -${Math.round(width * 0.1)}px; right: -${Math.round(width * 0.1)}px;
    "></div>
    <div class="blob" style="
      width: ${Math.round(width * 0.3)}px; height: ${Math.round(width * 0.3)}px;
      background: ${tokens.colorAccent};
      top: ${Math.round(height * 0.15)}px; left: -${Math.round(width * 0.05)}px;
      opacity: 0.08;
    "></div>

    <!-- Logo top-left -->
    ${tokens.logoUrl ? `
    <div style="position: absolute; top: ${sz}; left: ${sz}; z-index: 10;">
      <img src="${tokens.logoUrl}" class="brand-logo" alt="logo" />
    </div>` : `
    <div style="position: absolute; top: ${sz}; left: ${sz}; z-index: 10;">
      <span class="tagline" style="font-size: 13px;">${copy.tagline || ''}</span>
    </div>`}

    <!-- Tagline bar top-right -->
    <div style="
      position: absolute; top: ${sz}; right: ${sz};
      display: flex; align-items: center; gap: 10px; z-index: 10;
    ">
      <div class="accent-bar"></div>
      <span class="tagline">${copy.tagline || ''}</span>
    </div>

    <!-- Main headline -->
    <div style="
      position: absolute;
      top: ${contentTop}px;
      left: ${sz};
      right: ${sz};
      z-index: 10;
      padding-top: 60px;
    ">
      <h1 class="headline" style="max-width: ${Math.round(width * 0.6)}px;">
        ${copy.headline || ''}
      </h1>
    </div>

    <!-- Hero asset - right side, bottom-anchored -->
    ${hero_image_url ? `
    <div style="
      position: absolute;
      right: 0;
      bottom: 0;
      width: ${heroW}px;
      height: ${heroH}px;
      z-index: 5;
      overflow: hidden;
    ">
      <img
        src="${hero_image_url}"
        class="hero-asset"
        style="width: 100%; height: 100%; object-fit: cover; object-position: top center;"
        alt="hero"
      />
    </div>` : ''}

    <!-- Content card - bottom-left -->
    <div style="
      position: absolute;
      bottom: ${sz};
      left: ${sz};
      max-width: ${Math.round(width * 0.52)}px;
      z-index: 10;
    ">
      <p class="subheadline" style="margin-bottom: ${tokens.elementSpacing};">
        ${copy.subheadline || ''}
      </p>
      <p class="body-copy" style="margin-bottom: calc(${tokens.elementSpacing} * 1.4);">
        ${copy.body_copy || ''}
      </p>
      <a class="cta-btn" href="#">${copy.cta_text || 'Get Started'}</a>
    </div>

    <!-- Bottom gradient to ground CTA -->
    <div style="
      position: absolute; bottom: 0; left: 0; right: 0;
      height: ${Math.round(height * 0.35)}px;
      background: linear-gradient(to top, ${tokens.colorPrimary}EE 0%, transparent 100%);
      z-index: 4;
    "></div>
  `;
}

// ── Template: Vertical 9:16 ───────────────────────────────────────────────────
// Used for: Stories, TikTok
// Layout: hero top 50%, copy block middle, CTA bottom

function verticalTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const heroH = Math.round(height * 0.48);

  return `
    <!-- Background -->
    <div style="
      position: absolute; inset: 0;
      background: linear-gradient(180deg, ${tokens.colorPrimary} 0%, ${darken(tokens.colorPrimary, 25)} 100%);
    "></div>

    <!-- Accent circle decoration -->
    <div class="blob" style="
      width: ${Math.round(width * 0.8)}px; height: ${Math.round(width * 0.8)}px;
      background: ${tokens.colorAccent};
      top: -${Math.round(width * 0.2)}px; right: -${Math.round(width * 0.2)}px;
      opacity: 0.12;
    "></div>

    <!-- Logo top -->
    ${tokens.logoUrl ? `
    <div style="position: absolute; top: ${sz}; left: ${sz}; z-index: 20;">
      <img src="${tokens.logoUrl}" class="brand-logo" alt="logo" />
    </div>` : ''}

    <!-- Hero image top half -->
    ${hero_image_url ? `
    <div style="
      position: absolute; top: 0; left: 0; right: 0;
      height: ${heroH}px; z-index: 5; overflow: hidden;
    ">
      <img src="${hero_image_url}" class="hero-asset"
        style="width: 100%; height: 100%; object-fit: cover; object-position: top center;"
        alt="hero"
      />
      <!-- Fade bottom of hero into bg -->
      <div style="
        position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
        background: linear-gradient(to top, ${tokens.colorPrimary} 0%, transparent 100%);
      "></div>
    </div>` : ''}

    <!-- Copy block -->
    <div style="
      position: absolute;
      top: ${heroH - 30}px;
      left: ${sz}; right: ${sz};
      z-index: 10;
    ">
      <div class="accent-bar" style="margin-bottom: 16px;"></div>
      <h1 class="headline" style="
        font-size: calc(var(--headline-font-size) * 0.9);
        margin-bottom: ${tokens.elementSpacing};
      ">${copy.headline || ''}</h1>
      <p class="subheadline" style="margin-bottom: ${tokens.elementSpacing};">
        ${copy.subheadline || ''}
      </p>
      <p class="body-copy" style="margin-bottom: calc(${tokens.elementSpacing} * 1.6);">
        ${copy.body_copy || ''}
      </p>
    </div>

    <!-- CTA pinned to bottom -->
    <div style="
      position: absolute; bottom: ${sz}; left: ${sz}; right: ${sz};
      z-index: 10; text-align: center;
    ">
      <a class="cta-btn" href="#" style="font-size: 17px; display: block; text-align: center;">
        ${copy.cta_text || 'Get Started'}
      </a>
    </div>
  `;
}

// ── Template: Landscape 1.91:1 / 16:9 ────────────────────────────────────────
// Used for: LinkedIn, Twitter/X
// Layout: split — copy left, hero right

function landscapeTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const splitPoint = Math.round(width * 0.52);

  return `
    <!-- Background -->
    <div style="
      position: absolute; inset: 0;
      background: linear-gradient(135deg, ${tokens.colorPrimary} 0%, ${darken(tokens.colorPrimary, 15)} 100%);
    "></div>

    <!-- Vertical divider accent -->
    <div style="
      position: absolute;
      left: ${splitPoint - 2}px; top: 0; bottom: 0;
      width: 4px;
      background: linear-gradient(to bottom, transparent, ${tokens.colorAccent}, transparent);
      opacity: 0.6;
      z-index: 6;
    "></div>

    <!-- Left: Copy block -->
    <div style="
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: ${splitPoint}px;
      padding: ${sz};
      display: flex;
      flex-direction: column;
      justify-content: center;
      z-index: 10;
    ">
      ${tokens.logoUrl ? `
      <img src="${tokens.logoUrl}" class="brand-logo" style="margin-bottom: 24px;" alt="logo" />
      ` : `<span class="tagline" style="margin-bottom: 16px;">${copy.tagline || ''}</span>`}

      <div class="accent-bar" style="margin-bottom: 20px;"></div>

      <h1 class="headline" style="
        font-size: calc(var(--headline-font-size) * 0.72);
        margin-bottom: ${tokens.elementSpacing};
      ">${copy.headline || ''}</h1>

      <p class="subheadline" style="
        font-size: 13px;
        margin-bottom: calc(${tokens.elementSpacing} * 1.4);
      ">${copy.subheadline || ''}</p>

      <a class="cta-btn" href="#">${copy.cta_text || 'Get Started'}</a>
    </div>

    <!-- Right: Hero image -->
    ${hero_image_url ? `
    <div style="
      position: absolute;
      top: 0; right: 0; bottom: 0;
      width: ${width - splitPoint}px;
      z-index: 5; overflow: hidden;
    ">
      <img src="${hero_image_url}" class="hero-asset"
        style="width: 100%; height: 100%; object-fit: cover; object-position: center top;"
        alt="hero"
      />
      <!-- Fade left edge into bg -->
      <div style="
        position: absolute; top: 0; left: 0; bottom: 0; width: 80px;
        background: linear-gradient(to right, ${tokens.colorPrimary} 0%, transparent 100%);
      "></div>
    </div>` : ''}
  `;
}

// ── Color utilities ───────────────────────────────────────────────────────────

function darken(hex, percent) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

module.exports = { generateTemplate };
