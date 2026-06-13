/**
 * AuraEdge Ad Template Engine v3.0
 * Nigerian/West African Design DNA — 45 reference designs
 * 
 * Templates:
 *   square    - 1:1  (Instagram Post, Facebook Feed)
 *   vertical  - 9:16 (Stories, TikTok)
 *   landscape - 1.91:1 (LinkedIn, Twitter/X)
 * 
 * Design principles from 45 Nigerian reference designs:
 * - Hero image fills 60-70% of canvas, bleeds to edges
 * - Headline at 40-60% canvas width, heavyweight typography
 * - Info bar at bottom 15-20% with date/venue/CTA
 * - Dark gradient overlay ensures text legibility
 * - Pill badges for all temporal information
 * - High canvas density (15-25% white space only)
 */

const { getFontTokens, buildGoogleFontsImport } = require('./fonts');

function generateTemplate({ brand, layout, copy, hero_image_url, creative_direction, format, patches }) {
  const briefText = `${brand?.industry || ''} ${creative_direction?.concept || ''} ${layout?.template || ''}`;
  const conceptText = creative_direction?.concept || '';
  const fontCategory = layout?.font_category || brand?.font_category || creative_direction?.font_category || 'default';
  const fontTokens = getFontTokens(fontCategory !== 'default' ? fontCategory : briefText, conceptText);
  const tokens = resolveBrandTokens(brand, creative_direction, layout, patches, fontTokens);
  const ratio = format || inferRatio(layout?.canvas_width, layout?.canvas_height);
  const templateFn = ratio === '9:16' ? verticalTemplate
    : ratio === '1.91:1' || ratio === '16:9' ? landscapeTemplate
    : squareTemplate;
  const safeCopy = enforceCopyLimits(copy, layout);

  return buildDocument({
    tokens,
    copy: safeCopy,
    layout: layout || {},
    hero_image_url,
    templateFn,
    fontTokens,
    width: layout?.canvas_width || 1080,
    height: layout?.canvas_height || 1080
  });
}

function resolveBrandTokens(brand, creative, layout, patches, fontTokens) {
  const p = patches || {};
  const ft = fontTokens || {};
  const resolvedDisplayFont = brand?.font_display || ft.display || creative?.typography_heading || 'Plus Jakarta Sans';
  const resolvedBodyFont = brand?.font_body || ft.body || creative?.typography_body || 'Montserrat';

  return {
    colorPrimary:       brand?.primary_color || creative?.color_primary || '#0D1B2A',
    colorAccent:        brand?.accent_color  || creative?.color_accent  || '#D4AF37',
    colorBg:            brand?.bg_color      || creative?.color_bg      || '#0D1B2A',
    colorText:          '#FFFFFF',
    colorTextDark:      brand?.text_color_dark || '#0D1B2A',
    fontDisplay:        resolvedDisplayFont,
    fontDisplayStack:   ft.displayStack || `"${resolvedDisplayFont}", serif`,
    fontBody:           resolvedBodyFont,
    fontBodyStack:      ft.bodyStack    || `"${resolvedBodyFont}", sans-serif`,
    fontWeightDisplay:  ft.weights?.display || '800',
    fontWeightBody:     ft.weights?.body    || '400',
    logoUrl:            brand?.logo_url || null,
    headlineFontSize:   p.headlineFontSize || layout?.headline_font_size || '72px',
    headlineFontWeight: p.headlineFontWeight || ft.weights?.display || '800',
    bodyFontSize:       p.bodyFontSize || '15px',
    ctaBgColor:         p.ctaBgColor || brand?.accent_color || creative?.color_accent || '#D4AF37',
    ctaFontWeight:      '700',
    ctaPaddingX:        '32px',
    ctaPaddingY:        '14px',
    ctaFontSize:        '15px',
    safeZone:           layout?.safe_zone_padding || '48px',
    brandName:          brand?.brand_name || '',
  };
}

function enforceCopyLimits(copy, layout) {
  const limits = { headline: 40, subheadline: 80, body_copy: 120, cta_text: 24, tagline: 60 };
  const safe = {};
  for (const [key, val] of Object.entries(copy || {})) {
    safe[key] = truncate(val, limits[key] || 200);
  }
  return safe;
}

function truncate(str, maxChars) {
  if (!str || str.length <= maxChars) return str || '';
  const trimmed = str.slice(0, maxChars);
  const lastSpace = trimmed.lastIndexOf(' ');
  return lastSpace > maxChars * 0.6 ? trimmed.slice(0, lastSpace) + '…' : trimmed + '…';
}

function inferRatio(w, h) {
  if (!w || !h) return '1:1';
  const r = w / h;
  if (r < 0.7) return '9:16';
  if (r > 1.4) return '1.91:1';
  return '1:1';
}

function buildDocument({ tokens, copy, layout, hero_image_url, templateFn, fontTokens, width, height }) {
  const cssVars = buildCssVars(tokens);
  const googleFontsUrl = fontTokens ? buildGoogleFontsImport(fontTokens) : buildFallbackGoogleFontsUrl(tokens);
  const bodyHtml = templateFn({ tokens, copy, layout, hero_image_url, width, height });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${googleFontsUrl}">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @font-face { font-display: swap; }

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

    .headline {
      font-family: var(--font-display);
      font-size: var(--headline-font-size);
      font-weight: var(--headline-font-weight);
      line-height: 1.0;
      letter-spacing: -0.02em;
      color: #FFFFFF;
      text-shadow: 0 2px 20px rgba(0,0,0,0.5);
    }

    .pill-badge {
      display: inline-flex;
      align-items: center;
      background: var(--color-accent);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 700;
      padding: 6px 18px;
      border-radius: 100px;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .cta-btn {
      display: inline-block;
      background: var(--cta-bg-color);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--cta-font-size);
      font-weight: var(--cta-font-weight);
      padding: var(--cta-padding-y) var(--cta-padding-x);
      border-radius: 100px;
      letter-spacing: 0.02em;
      white-space: nowrap;
      text-decoration: none;
    }

    .brand-logo {
      max-width: 100px;
      max-height: 36px;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }

    .tagline-text {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--color-accent);
    }

    .subheadline-text {
      font-family: var(--font-body);
      font-size: 16px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      line-height: 1.4;
    }

    .body-text {
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 400;
      color: rgba(255,255,255,0.75);
      line-height: 1.5;
    }

    .accent-line {
      width: 40px;
      height: 3px;
      background: var(--color-accent);
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div id="ad-canvas">
    ${bodyHtml}
  </div>
  <script>document.body.setAttribute('data-render-ready', 'true');</script>
</body>
</html>`;
}

function buildCssVars(tokens) {
  return Object.entries({
    '--color-primary':        tokens.colorPrimary,
    '--color-accent':         tokens.colorAccent,
    '--color-bg':             tokens.colorBg,
    '--color-text':           tokens.colorText,
    '--color-text-dark':      tokens.colorTextDark,
    '--font-display':         tokens.fontDisplayStack || `"${tokens.fontDisplay}", serif`,
    '--font-body':            tokens.fontBodyStack    || `"${tokens.fontBody}", sans-serif`,
    '--font-weight-display':  tokens.fontWeightDisplay || '800',
    '--font-weight-body':     tokens.fontWeightBody    || '400',
    '--headline-font-size':   tokens.headlineFontSize,
    '--headline-font-weight': tokens.headlineFontWeight,
    '--body-font-size':       tokens.bodyFontSize,
    '--cta-bg-color':         tokens.ctaBgColor,
    '--cta-font-weight':      tokens.ctaFontWeight,
    '--cta-padding-x':        tokens.ctaPaddingX,
    '--cta-padding-y':        tokens.ctaPaddingY,
    '--cta-font-size':        tokens.ctaFontSize,
    '--safe-zone':            tokens.safeZone,
  }).map(([k, v]) => `      ${k}: ${v};`).join('\n');
}

function buildFallbackGoogleFontsUrl(tokens) {
  const families = [tokens.fontDisplay, tokens.fontBody]
    .filter(Boolean)
    .map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

// ── SQUARE TEMPLATE 1:1 ───────────────────────────────────────────────────────
// Nigerian flyer DNA: hero fills canvas, headline top-left dominant,
// info bar bottom with pill badges, gradient overlay for legibility

function squareTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = 48;
  const infoBarH = Math.round(height * 0.22);
  const gradientColor = tokens.colorPrimary;

  return `
    <!-- Full-canvas hero image -->
    ${hero_image_url ? `
    <div style="position:absolute;inset:0;z-index:1;">
      <img src="${hero_image_url}"
        style="width:100%;height:100%;object-fit:cover;object-position:center top;"
        alt="hero" />
    </div>` : `
    <div style="position:absolute;inset:0;z-index:1;background:${gradientColor};"></div>`}

    <!-- Dark gradient overlay top — ensures headline legibility -->
    <div style="
      position:absolute;top:0;left:0;right:0;
      height:55%;z-index:2;
      background:linear-gradient(to bottom,
        rgba(0,0,0,0.75) 0%,
        rgba(0,0,0,0.4) 60%,
        transparent 100%);
    "></div>

    <!-- Dark gradient overlay bottom — info bar background -->
    <div style="
      position:absolute;bottom:0;left:0;right:0;
      height:${infoBarH + 40}px;z-index:2;
      background:linear-gradient(to top,
        ${gradientColor}F5 0%,
        ${gradientColor}CC 50%,
        transparent 100%);
    "></div>

    <!-- TOP SECTION: Brand + Tagline -->
    <div style="
      position:absolute;top:${sz}px;left:${sz}px;right:${sz}px;
      z-index:10;
      display:flex;justify-content:space-between;align-items:center;
    ">
      ${tokens.logoUrl
        ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
        : `<span class="tagline-text">${tokens.brandName || copy.tagline || ''}</span>`
      }
      ${copy.date_badge ? `<span class="pill-badge">${copy.date_badge}</span>` : ''}
    </div>

    <!-- HEADLINE — dominant, top-left, 40% canvas -->
    <div style="
      position:absolute;
      top:${sz + 60}px;
      left:${sz}px;
      right:${Math.round(width * 0.15)}px;
      z-index:10;
    ">
      <div class="accent-line" style="margin-bottom:16px;"></div>
      <h1 class="headline" style="
        font-size:${Math.round(width * 0.072)}px;
        max-width:${Math.round(width * 0.75)}px;
        margin-bottom:12px;
      ">${copy.headline || ''}</h1>
      ${copy.subheadline ? `
      <p class="subheadline-text" style="
        max-width:${Math.round(width * 0.65)}px;
        margin-top:12px;
      ">${copy.subheadline}</p>` : ''}
    </div>

    <!-- BOTTOM INFO BAR -->
    <div style="
      position:absolute;
      bottom:0;left:0;right:0;
      height:${infoBarH}px;
      z-index:10;
      padding:20px ${sz}px;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
    ">
      <!-- Info row: body copy + venue -->
      <div style="margin-bottom:14px;">
        ${copy.body_copy ? `<p class="body-text">${copy.body_copy}</p>` : ''}
        ${copy.venue_text ? `<p class="body-text" style="margin-top:4px;">📍 ${copy.venue_text}</p>` : ''}
      </div>

      <!-- CTA row -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <a class="cta-btn" href="#">${copy.cta_text || 'Register Now'}</a>
        ${copy.tagline ? `<span class="tagline-text">${copy.tagline}</span>` : ''}
      </div>
    </div>

    <!-- Decorative accent dot top-right -->
    <div style="
      position:absolute;top:${sz}px;right:${sz}px;
      width:8px;height:8px;
      border-radius:50%;
      background:var(--color-accent);
      z-index:10;
    "></div>
  `;
}

// ── VERTICAL TEMPLATE 9:16 ────────────────────────────────────────────────────
// Hero top 55%, copy block center, CTA pinned bottom

function verticalTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = 52;
  const heroH = Math.round(height * 0.52);
  const gradientColor = tokens.colorPrimary;

  return `
    <!-- Background -->
    <div style="position:absolute;inset:0;z-index:1;background:${gradientColor};"></div>

    <!-- Hero image top -->
    ${hero_image_url ? `
    <div style="position:absolute;top:0;left:0;right:0;height:${heroH}px;z-index:2;overflow:hidden;">
      <img src="${hero_image_url}"
        style="width:100%;height:100%;object-fit:cover;object-position:top center;"
        alt="hero"/>
      <div style="
        position:absolute;bottom:0;left:0;right:0;height:160px;
        background:linear-gradient(to top,${gradientColor} 0%,transparent 100%);
      "></div>
    </div>` : ''}

    <!-- Brand top -->
    <div style="
      position:absolute;top:${sz}px;left:${sz}px;right:${sz}px;
      z-index:10;display:flex;justify-content:space-between;align-items:center;
    ">
      ${tokens.logoUrl
        ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
        : `<span class="tagline-text">${tokens.brandName || ''}</span>`
      }
      ${copy.date_badge ? `<span class="pill-badge">${copy.date_badge}</span>` : ''}
    </div>

    <!-- Copy block -->
    <div style="
      position:absolute;
      top:${heroH - 20}px;
      left:${sz}px;right:${sz}px;
      z-index:10;
    ">
      <div class="accent-line" style="margin-bottom:16px;"></div>
      <h1 class="headline" style="font-size:${Math.round(width * 0.085)}px;margin-bottom:14px;">
        ${copy.headline || ''}
      </h1>
      ${copy.subheadline ? `<p class="subheadline-text" style="margin-bottom:12px;">${copy.subheadline}</p>` : ''}
      ${copy.body_copy ? `<p class="body-text" style="margin-bottom:8px;">${copy.body_copy}</p>` : ''}
      ${copy.venue_text ? `<p class="body-text">📍 ${copy.venue_text}</p>` : ''}
    </div>

    <!-- CTA pinned bottom -->
    <div style="
      position:absolute;bottom:${sz}px;left:${sz}px;right:${sz}px;
      z-index:10;text-align:center;
    ">
      <a class="cta-btn" href="#" style="display:block;text-align:center;font-size:17px;">
        ${copy.cta_text || 'Register Now'}
      </a>
      ${copy.tagline ? `<p class="tagline-text" style="margin-top:14px;text-align:center;">${copy.tagline}</p>` : ''}
    </div>
  `;
}

// ── LANDSCAPE TEMPLATE 1.91:1 / 16:9 ─────────────────────────────────────────
// Split: copy left 48%, hero right 52%

function landscapeTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = 48;
  const splitPoint = Math.round(width * 0.48);
  const gradientColor = tokens.colorPrimary;

  return `
    <!-- Background -->
    <div style="position:absolute;inset:0;z-index:1;background:${gradientColor};"></div>

    <!-- Right: Hero image -->
    ${hero_image_url ? `
    <div style="
      position:absolute;top:0;right:0;bottom:0;
      width:${width - splitPoint + 40}px;z-index:2;overflow:hidden;
    ">
      <img src="${hero_image_url}"
        style="width:100%;height:100%;object-fit:cover;object-position:center top;"
        alt="hero"/>
      <div style="
        position:absolute;top:0;left:0;bottom:0;width:120px;
        background:linear-gradient(to right,${gradientColor} 0%,transparent 100%);
      "></div>
    </div>` : ''}

    <!-- Vertical accent line -->
    <div style="
      position:absolute;left:${splitPoint}px;top:10%;bottom:10%;
      width:3px;z-index:5;
      background:linear-gradient(to bottom,transparent,var(--color-accent),transparent);
      opacity:0.7;
    "></div>

    <!-- Left: Copy -->
    <div style="
      position:absolute;top:0;left:0;bottom:0;
      width:${splitPoint}px;
      padding:${sz}px;
      z-index:10;
      display:flex;flex-direction:column;justify-content:center;
    ">
      <div style="margin-bottom:20px;">
        ${tokens.logoUrl
          ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
          : `<span class="tagline-text">${tokens.brandName || ''}</span>`
        }
      </div>
      <div class="accent-line" style="margin-bottom:18px;"></div>
      <h1 class="headline" style="
        font-size:${Math.round(height * 0.1)}px;
        margin-bottom:14px;
      ">${copy.headline || ''}</h1>
      ${copy.subheadline ? `<p class="subheadline-text" style="margin-bottom:16px;">${copy.subheadline}</p>` : ''}
      ${copy.date_badge ? `<div style="margin-bottom:16px;"><span class="pill-badge">${copy.date_badge}</span></div>` : ''}
      <a class="cta-btn" href="#" style="align-self:flex-start;">${copy.cta_text || 'Register Now'}</a>
    </div>
  `;
}

// ── Color utilities ───────────────────────────────────────────────────────────

function darken(hex, percent) {
  try {
    const num = parseInt((hex || '#0D1B2A').replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  } catch { return hex || '#0D1B2A'; }
}

function adaptLayoutForVariant(layout, variant) {
  const adapted = { ...layout, canvas_width: variant.width, canvas_height: variant.height };
  if (variant.ratio === '9:16') {
    adapted.template = 'vertical';
    adapted.safe_zone_padding = '80px';
    adapted.headline_font_size = scaleFont(layout?.headline_font_size, 0.85);
  }
  if (variant.ratio === '1.91:1' || variant.ratio === '16:9') {
    adapted.template = 'landscape';
    adapted.safe_zone_padding = '48px';
    adapted.headline_font_size = scaleFont(layout?.headline_font_size, 0.7);
  }
  return adapted;
}

function scaleFont(fontSizeStr, scale) {
  if (!fontSizeStr) return fontSizeStr;
  const match = fontSizeStr.match(/^(\d+(?:\.\d+)?)(px|rem|em|pt)$/);
  if (!match) return fontSizeStr;
  return `${Math.round(parseFloat(match[1]) * scale)}${match[2]}`;
}

module.exports = { generateTemplate, adaptLayoutForVariant };
