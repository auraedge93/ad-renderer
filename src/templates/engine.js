/**
 * AuraEdge Ad Template Engine v4.0
 * Nigerian/West African Design DNA — rebuilt from 3-image reference analysis
 *
 * KEY DESIGN PRINCIPLES FROM REFERENCES:
 * 1. People are FOREGROUND — cutout subjects bleed past frame edges, z-index above type
 * 2. Event name IS the design — type fills 40-60% canvas, 180-320px scale
 * 3. Three clear zones: TOP (brand/logo), MIDDLE (headline + people), BOTTOM (info bar)
 * 4. Dark gradient behind text zone only — not full canvas darkening
 * 5. Every detail in a pill badge — date, time, theme, admission
 * 6. High density — 85%+ canvas coverage, hierarchy by size not whitespace
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
  const p = patches?.patches || patches || {};
  const ft = fontTokens || {};
  const resolvedDisplayFont = brand?.font_display || ft.display || creative?.typography_heading || 'Bebas Neue';
  const resolvedBodyFont = brand?.font_body || ft.body || creative?.typography_body || 'Montserrat';

  return {
    colorPrimary:       brand?.primary_color || creative?.color_primary || '#0D1B2A',
    colorAccent:        brand?.accent_color  || creative?.color_accent  || '#D4AF37',
    colorBg:            brand?.bg_color      || creative?.color_bg      || '#0D1B2A',
    colorText:          '#FFFFFF',
    colorTextDark:      brand?.text_color_dark || '#1A0A00',
    fontDisplay:        resolvedDisplayFont,
    fontDisplayStack:   ft.displayStack || `"${resolvedDisplayFont}", "Anton", "Impact", serif`,
    fontBody:           resolvedBodyFont,
    fontBodyStack:      ft.bodyStack    || `"${resolvedBodyFont}", "Poppins", sans-serif`,
    fontWeightDisplay:  ft.weights?.display || '900',
    fontWeightBody:     ft.weights?.body    || '400',
    logoUrl:            brand?.logo_url || null,
    headlineFontSize:   p.headlineFontSize || layout?.headline_font_size || '110px',
    headlineFontWeight: p.headlineFontWeight || ft.weights?.display || '900',
    bodyFontSize:       p.bodyFontSize || '15px',
    ctaBgColor:         p.ctaBgColor || brand?.accent_color || creative?.color_accent || '#D4AF37',
    ctaTextColor:       contrastColor(brand?.accent_color || creative?.color_accent || '#D4AF37'),
    ctaFontWeight:      p.ctaFontWeight || '800',
    ctaPaddingX:        p.ctaPaddingX || '40px',
    ctaPaddingY:        p.ctaPaddingY || '18px',
    ctaFontSize:        '16px',
    safeZone:           parseInt(layout?.safe_zone_padding) || 56,
    brandName:          brand?.brand_name || '',
  };
}

// Pick black or white text based on background luminance
function contrastColor(hex) {
  try {
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
    return lum > 0.55 ? '#0D1B2A' : '#FFFFFF';
  } catch { return '#0D1B2A'; }
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

    /* ── TYPOGRAPHY ── */
    .headline {
      font-family: var(--font-display);
      font-size: var(--headline-font-size);
      font-weight: var(--headline-font-weight);
      line-height: 0.92;
      letter-spacing: -0.01em;
      color: #FFFFFF;
      text-transform: uppercase;
      text-shadow: 3px 3px 0px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6);
    }

    .headline-accent {
      color: var(--color-accent);
    }

    .event-number {
      font-family: var(--font-display);
      font-weight: 900;
      color: var(--color-accent);
      text-shadow: 4px 4px 0px rgba(0,0,0,0.5);
    }

    .subheadline-text {
      font-family: var(--font-body);
      font-size: 17px;
      font-weight: 600;
      color: rgba(255,255,255,0.95);
      line-height: 1.35;
      letter-spacing: 0.02em;
    }

    .body-text {
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 400;
      color: rgba(255,255,255,0.85);
      line-height: 1.5;
    }

    .tagline-text {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-accent);
    }

    /* ── BADGES & BUTTONS ── */
    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-accent);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 800;
      padding: 7px 18px;
      border-radius: 100px;
      letter-spacing: 0.04em;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .pill-badge-dark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0,0,0,0.65);
      border: 1px solid rgba(255,255,255,0.2);
      color: #FFFFFF;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 700;
      padding: 7px 16px;
      border-radius: 100px;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .theme-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--color-accent);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .cta-btn {
      display: inline-block;
      background: var(--cta-bg-color);
      color: var(--cta-text-color);
      font-family: var(--font-body);
      font-size: var(--cta-font-size);
      font-weight: var(--cta-font-weight);
      padding: var(--cta-padding-y) var(--cta-padding-x);
      border-radius: 100px;
      letter-spacing: 0.04em;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .info-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      border: 1.5px solid rgba(255,255,255,0.25);
      color: #FFFFFF;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      white-space: nowrap;
    }

    /* ── BRAND LOGO ── */
    .brand-logo {
      max-width: 120px;
      max-height: 44px;
      object-fit: contain;
      filter: brightness(0) invert(1);
    }

    .brand-name-text {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.9);
    }

    /* ── ACCENT ELEMENTS ── */
    .accent-line {
      height: 4px;
      background: var(--color-accent);
      border-radius: 2px;
    }

    .divider-line {
      width: 100%;
      height: 1px;
      background: rgba(255,255,255,0.15);
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
    '--font-display':         tokens.fontDisplayStack,
    '--font-body':            tokens.fontBodyStack,
    '--headline-font-size':   tokens.headlineFontSize,
    '--headline-font-weight': tokens.headlineFontWeight,
    '--cta-bg-color':         tokens.ctaBgColor,
    '--cta-text-color':       tokens.ctaTextColor,
    '--cta-font-weight':      tokens.ctaFontWeight,
    '--cta-font-size':        tokens.ctaFontSize,
    '--cta-padding-x':        tokens.ctaPaddingX,
    '--cta-padding-y':        tokens.ctaPaddingY,
  }).map(([k, v]) => `      ${k}: ${v};`).join('\n');
}

function buildFallbackGoogleFontsUrl(tokens) {
  const display = (tokens.fontDisplay || 'Bebas Neue').replace(/ /g, '+');
  const body = (tokens.fontBody || 'Montserrat').replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${display}&family=${body}:wght@400;600;700;800&display=swap`;
}


// ══════════════════════════════════════════════════════════════════════════════
// SQUARE TEMPLATE 1:1  (1080×1080)
// Based on reference designs: 3-zone layout, people forward, giant type
//
// ZONE 1 (top 12%):   Brand name + date badge pill
// ZONE 2 (mid 55%):   Giant headline + hero image (person bleeds INTO headline)
// ZONE 3 (bot 33%):   Dark info bar with subheadline, venue, CTA
// ══════════════════════════════════════════════════════════════════════════════

function squareTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const bg = tokens.colorBg;
  const accent = tokens.colorAccent;
  const primary = tokens.colorPrimary;

  // Zone heights
  const topBarH  = Math.round(height * 0.11);   // brand bar
  const infoBarH = Math.round(height * 0.30);   // bottom info bar
  const midH     = height - topBarH - infoBarH; // hero + headline zone

  // Headline size — big, like the references
  const hl = parseInt(tokens.headlineFontSize) || 110;

  // Gradient for left side text protection
  const leftGrad = `linear-gradient(to right, ${primary}EE 0%, ${primary}CC 35%, ${primary}88 60%, transparent 85%)`;
  // Top gradient
  const topGrad  = `linear-gradient(to bottom, ${primary}DD 0%, transparent 100%)`;
  // Bottom info bar background
  const barBg    = darken(primary, 15);

  return `
    <!-- ── LAYER 1: Base background ── -->
    <div style="position:absolute;inset:0;z-index:1;background:${bg};"></div>

    <!-- ── LAYER 2: Hero image — bleeds full canvas ── -->
    ${hero_image_url ? `
    <div style="position:absolute;inset:0;z-index:2;overflow:hidden;">
      <img src="${hero_image_url}"
        style="
          width:100%;height:100%;
          object-fit:cover;
          object-position:center top;
        "
        alt="hero" crossorigin="anonymous"/>
    </div>` : ''}

    <!-- ── LAYER 3: Left gradient — protects text from image ── -->
    <div style="
      position:absolute;inset:0;z-index:3;
      background:${leftGrad};
    "></div>

    <!-- ── LAYER 4: Top gradient ── -->
    <div style="
      position:absolute;top:0;left:0;right:0;height:${topBarH + 40}px;
      z-index:4;
      background:${topGrad};
    "></div>

    <!-- ── LAYER 5: Bottom info bar ── -->
    <div style="
      position:absolute;bottom:0;left:0;right:0;height:${infoBarH}px;
      z-index:4;
      background:${barBg};
      border-top:3px solid ${accent};
    "></div>

    <!-- ── ZONE 1: Top brand bar ── -->
    <div style="
      position:absolute;
      top:0;left:0;right:0;height:${topBarH}px;
      z-index:10;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 ${sz}px;
    ">
      <!-- Brand identity -->
      <div style="display:flex;align-items:center;gap:12px;">
        ${tokens.logoUrl
          ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
          : `<div>
               <div class="accent-line" style="width:30px;margin-bottom:6px;"></div>
               <span class="brand-name-text">${tokens.brandName || ''}</span>
             </div>`
        }
      </div>
      <!-- Date badge top-right -->
      ${copy.date_badge
        ? `<span class="pill-badge">${copy.date_badge}</span>`
        : ''
      }
    </div>

    <!-- ── ZONE 2: Headline — top-left, large, on top of hero ── -->
    <div style="
      position:absolute;
      top:${topBarH + 20}px;
      left:${sz}px;
      width:${Math.round(width * 0.72)}px;
      z-index:10;
    ">
      <!-- Tagline / event category above headline -->
      ${copy.tagline ? `
      <div style="margin-bottom:14px;">
        <span class="tagline-text">${copy.tagline}</span>
      </div>` : ''}

      <!-- GIANT HEADLINE -->
      <h1 class="headline" style="
        font-size:${hl}px;
        max-width:${Math.round(width * 0.68)}px;
        line-height:0.90;
      ">${copy.headline || ''}</h1>

      <!-- Theme badge under headline -->
      ${copy.subheadline ? `
      <div style="margin-top:18px;">
        <div style="
          display:inline-flex;align-items:center;gap:8px;
          background:${accent};
          padding:7px 16px;border-radius:6px;
        ">
          <span style="
            font-family:var(--font-body);font-size:11px;
            font-weight:800;letter-spacing:0.1em;
            color:${contrastColor(accent)};text-transform:uppercase;
          ">THEME</span>
          <span style="
            font-family:var(--font-body);font-size:14px;
            font-weight:700;color:${contrastColor(accent)};
            letter-spacing:0.02em;
          ">${copy.subheadline}</span>
        </div>
      </div>` : ''}
    </div>

    <!-- ── ZONE 3: Bottom info bar ── -->
    <div style="
      position:absolute;
      bottom:0;left:0;right:0;
      height:${infoBarH}px;
      z-index:10;
      padding:${Math.round(infoBarH * 0.12)}px ${sz}px;
      display:flex;flex-direction:column;justify-content:space-between;
    ">
      <!-- Row 1: date + time details -->
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        ${copy.date_badge ? `
        <div style="display:flex;flex-direction:column;">
          <span style="
            font-family:var(--font-display);
            font-size:${Math.round(infoBarH * 0.22)}px;
            font-weight:900;
            color:#FFFFFF;
            line-height:0.95;
            letter-spacing:-0.01em;
          ">${copy.date_badge.split('|')[0]?.trim() || copy.date_badge}</span>
          ${copy.date_badge.includes('|') ? `
          <span class="pill-badge" style="margin-top:8px;align-self:flex-start;font-size:11px;">
            ${copy.date_badge.split('|')[1]?.trim() || ''}
          </span>` : ''}
        </div>` : ''}

        <!-- Vertical divider -->
        ${copy.date_badge && copy.venue_text ? `
        <div style="width:1.5px;height:${Math.round(infoBarH * 0.35)}px;background:rgba(255,255,255,0.2);"></div>` : ''}

        <!-- Venue info -->
        ${copy.venue_text ? `
        <div style="
          background:${accent};
          border-radius:8px;
          padding:10px 16px;
          max-width:${Math.round(width * 0.38)}px;
        ">
          <p style="
            font-family:var(--font-body);
            font-size:12px;font-weight:800;
            color:${contrastColor(accent)};
            letter-spacing:0.06em;text-transform:uppercase;
            margin-bottom:3px;
          ">📍 VENUE</p>
          <p style="
            font-family:var(--font-body);
            font-size:13px;font-weight:600;
            color:${contrastColor(accent)};
            line-height:1.3;
          ">${copy.venue_text}</p>
        </div>` : ''}
      </div>

      <!-- Row 2: body copy + CTA -->
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;">
        <div style="flex:1;">
          ${copy.body_copy ? `
          <p class="body-text" style="font-size:13px;color:rgba(255,255,255,0.75);">
            ${copy.body_copy}
          </p>` : ''}
        </div>
        <a class="cta-btn" style="flex-shrink:0;">
          ${copy.cta_text || 'Register Now'}
        </a>
      </div>
    </div>

    <!-- ── Info bar top accent line ── -->
    <div style="
      position:absolute;
      bottom:${infoBarH}px;left:0;right:0;
      height:4px;z-index:11;
      background:linear-gradient(to right, ${accent}, ${accent}88, transparent);
    "></div>
  `;
}


// ══════════════════════════════════════════════════════════════════════════════
// VERTICAL TEMPLATE 9:16  (1080×1920)
// Hero top 50% with cutout bleeding down, copy block below, pinned CTA
// ══════════════════════════════════════════════════════════════════════════════

function verticalTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const bg = tokens.colorBg;
  const accent = tokens.colorAccent;
  const primary = tokens.colorPrimary;

  const topBarH  = Math.round(height * 0.09);
  const heroH    = Math.round(height * 0.50);
  const infoBarH = Math.round(height * 0.14);
  const hl = Math.round(parseInt(tokens.headlineFontSize) * 1.1) || 120;

  return `
    <!-- Background -->
    <div style="position:absolute;inset:0;z-index:1;background:${bg};"></div>

    <!-- Hero image — top half, bleeds down -->
    ${hero_image_url ? `
    <div style="position:absolute;top:0;left:0;right:0;height:${heroH + 80}px;z-index:2;overflow:hidden;">
      <img src="${hero_image_url}"
        style="width:100%;height:100%;object-fit:cover;object-position:center top;"
        alt="hero" crossorigin="anonymous"/>
      <div style="
        position:absolute;bottom:0;left:0;right:0;height:200px;
        background:linear-gradient(to top,${bg} 0%,transparent 100%);
      "></div>
    </div>` : ''}

    <!-- Top brand bar -->
    <div style="
      position:absolute;top:0;left:0;right:0;height:${topBarH}px;
      z-index:10;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 ${sz}px;
      background:linear-gradient(to bottom,${primary}CC,transparent);
    ">
      ${tokens.logoUrl
        ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
        : `<span class="brand-name-text">${tokens.brandName || ''}</span>`
      }
      ${copy.date_badge ? `<span class="pill-badge" style="font-size:12px;">${copy.date_badge}</span>` : ''}
    </div>

    <!-- Middle: Headline -->
    <div style="
      position:absolute;
      top:${heroH - 30}px;
      left:${sz}px;right:${sz}px;
      z-index:10;
    ">
      ${copy.tagline ? `<div style="margin-bottom:12px;"><span class="tagline-text">${copy.tagline}</span></div>` : ''}
      <h1 class="headline" style="font-size:${hl}px;margin-bottom:16px;">${copy.headline || ''}</h1>
      ${copy.subheadline ? `
      <div style="
        display:inline-flex;align-items:center;gap:8px;
        background:${accent};padding:8px 16px;border-radius:6px;margin-bottom:16px;
      ">
        <span style="font-family:var(--font-body);font-size:11px;font-weight:800;color:${contrastColor(accent)};letter-spacing:0.08em;text-transform:uppercase;">THEME</span>
        <span style="font-family:var(--font-body);font-size:14px;font-weight:700;color:${contrastColor(accent)};">${copy.subheadline}</span>
      </div>` : ''}
      ${copy.body_copy ? `<p class="body-text" style="margin-bottom:10px;">${copy.body_copy}</p>` : ''}
      ${copy.venue_text ? `<p class="body-text">📍 ${copy.venue_text}</p>` : ''}
    </div>

    <!-- Bottom info bar -->
    <div style="
      position:absolute;bottom:0;left:0;right:0;height:${infoBarH}px;
      z-index:10;
      background:${darken(primary, 15)};
      border-top:3px solid ${accent};
      padding:0 ${sz}px;
      display:flex;align-items:center;justify-content:center;
    ">
      <a class="cta-btn" style="font-size:18px;padding:20px 60px;">${copy.cta_text || 'Register Now'}</a>
    </div>
  `;
}


// ══════════════════════════════════════════════════════════════════════════════
// LANDSCAPE TEMPLATE 1.91:1 / 16:9
// Left 45% copy, right 55% hero
// ══════════════════════════════════════════════════════════════════════════════

function landscapeTemplate({ tokens, copy, layout, hero_image_url, width, height }) {
  const sz = tokens.safeZone;
  const bg = tokens.colorBg;
  const accent = tokens.colorAccent;
  const primary = tokens.colorPrimary;

  const splitPoint = Math.round(width * 0.46);
  const hl = Math.round(parseInt(tokens.headlineFontSize) * 0.65) || 72;

  return `
    <!-- Background -->
    <div style="position:absolute;inset:0;z-index:1;background:${bg};"></div>

    <!-- Right: Hero image -->
    ${hero_image_url ? `
    <div style="
      position:absolute;top:0;right:0;bottom:0;
      width:${width - splitPoint + 60}px;z-index:2;overflow:hidden;
    ">
      <img src="${hero_image_url}"
        style="width:100%;height:100%;object-fit:cover;object-position:center top;"
        alt="hero" crossorigin="anonymous"/>
      <div style="
        position:absolute;top:0;left:0;bottom:0;width:160px;
        background:linear-gradient(to right,${bg} 0%,transparent 100%);
      "></div>
    </div>` : ''}

    <!-- Left: Copy -->
    <div style="
      position:absolute;top:0;left:0;bottom:0;
      width:${splitPoint}px;
      padding:${sz}px;
      z-index:10;
      display:flex;flex-direction:column;justify-content:center;
      background:linear-gradient(to right, ${primary} 60%, ${primary}00 100%);
    ">
      <!-- Brand -->
      <div style="margin-bottom:20px;">
        ${tokens.logoUrl
          ? `<img src="${tokens.logoUrl}" class="brand-logo" alt="logo"/>`
          : `<span class="brand-name-text">${tokens.brandName || ''}</span>`
        }
      </div>
      <!-- Accent line -->
      <div class="accent-line" style="width:40px;margin-bottom:16px;"></div>
      <!-- Headline -->
      <h1 class="headline" style="font-size:${hl}px;margin-bottom:14px;">${copy.headline || ''}</h1>
      ${copy.subheadline ? `<p class="subheadline-text" style="margin-bottom:14px;">${copy.subheadline}</p>` : ''}
      ${copy.date_badge ? `<div style="margin-bottom:14px;"><span class="pill-badge">${copy.date_badge}</span></div>` : ''}
      ${copy.venue_text ? `<p class="body-text" style="margin-bottom:16px;">📍 ${copy.venue_text}</p>` : ''}
      <a class="cta-btn" style="align-self:flex-start;">${copy.cta_text || 'Register Now'}</a>
    </div>

    <!-- Vertical accent rule -->
    <div style="
      position:absolute;left:${splitPoint - 2}px;top:10%;bottom:10%;
      width:3px;z-index:5;
      background:linear-gradient(to bottom,transparent,${accent},transparent);
    "></div>
  `;
}


// ── Utilities ─────────────────────────────────────────────────────────────────

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
