/**
 * Font Pack — Nigerian/West African Social Media Design System
 *
 * All fonts are Google Fonts — guaranteed to load in Puppeteer.
 * Pairings are organized by design category matching the 41-reference DNA.
 *
 * Usage: fontPack.getTokens(category) returns { display, body, accent, googleFontsUrl }
 */

const FONT_PAIRINGS = {

  // ── Premium Ministry Conference ────────────────────────────────────────────
  // Reference: Prosperity Conference, Holy Spirit Conference, A Thousand Times More
  // Feels: regal, weighty, eternal
  premium_ministry: {
    display:      'Cinzel Decorative',
    displayStack: '"Cinzel Decorative", "Trajan Pro", serif',
    body:         'Raleway',
    bodyStack:    '"Raleway", "Montserrat", sans-serif',
    accent:       'Cormorant Garamond',
    accentStack:  '"Cormorant Garamond", "Playfair Display", serif',
    weights:      { display: '700', body: '500', accent: '600' },
    googleFonts:  ['Cinzel+Decorative:wght@700', 'Raleway:wght@400;500;600;700', 'Cormorant+Garamond:wght@600'],
  },

  // ── Warfare / Power Ministry ───────────────────────────────────────────────
  // Reference: War Room, Advanced Spiritual Warfare, Force of Vision
  // Feels: bold, commanding, urgent
  warfare_ministry: {
    display:      'Oswald',
    displayStack: '"Oswald", "Barlow Condensed", sans-serif',
    body:         'Montserrat',
    bodyStack:    '"Montserrat", "Roboto", sans-serif',
    accent:       'Bebas Neue',
    accentStack:  '"Bebas Neue", "Anton", sans-serif',
    weights:      { display: '700', body: '500', accent: '400' },
    googleFonts:  ['Oswald:wght@400;600;700', 'Montserrat:wght@400;500;600;700', 'Bebas+Neue'],
  },

  // ── Youth / Energy Church Events ───────────────────────────────────────────
  // Reference: RCCG Vibes & Vision, Creativity Sunday, 7 Days Graphic Design
  // Feels: high-energy, youthful, bold
  youth_energy: {
    display:      'Bebas Neue',
    displayStack: '"Bebas Neue", "Anton", "Impact", sans-serif',
    body:         'Poppins',
    bodyStack:    '"Poppins", "Nunito", sans-serif',
    accent:       'Pacifico',
    accentStack:  '"Pacifico", cursive',
    weights:      { display: '400', body: '600', accent: '400' },
    googleFonts:  ['Bebas+Neue', 'Poppins:wght@400;500;600;700;800', 'Pacifico'],
  },

  // ── Business / Leadership Summit ───────────────────────────────────────────
  // Reference: Accrington Leadership Summit, Mega Deal Conference
  // Feels: professional, authoritative, modern
  business_leadership: {
    display:      'Barlow Condensed',
    displayStack: '"Barlow Condensed", "Oswald", sans-serif',
    body:         'DM Sans',
    bodyStack:    '"DM Sans", "Inter", sans-serif',
    accent:       'Playfair Display',
    accentStack:  '"Playfair Display", Georgia, serif',
    weights:      { display: '800', body: '400', accent: '600' },
    googleFonts:  ['Barlow+Condensed:wght@600;700;800', 'DM+Sans:wght@400;500;600', 'Playfair+Display:wght@600;700'],
  },

  // ── Worship / Intimate Session ─────────────────────────────────────────────
  // Reference: Alone With Him, Advanced Spiritual Knowledge (soft version)
  // Feels: cinematic, peaceful, devotional
  worship_intimate: {
    display:      'Playfair Display',
    displayStack: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body:         'Lato',
    bodyStack:    '"Lato", "Source Sans Pro", sans-serif',
    accent:       'Dancing Script',
    accentStack:  '"Dancing Script", cursive',
    weights:      { display: '700', body: '400', accent: '600' },
    googleFonts:  ['Playfair+Display:wght@400;700;900', 'Lato:wght@300;400;700', 'Dancing+Script:wght@600;700'],
  },

  // ── Prayer / Fasting ───────────────────────────────────────────────────────
  // Reference: 21 Days Fasting, 30 Days Fasting & Prayers, Hour of Prayer
  // Feels: solemn, urgent, expectant
  prayer_fasting: {
    display:      'Exo 2',
    displayStack: '"Exo 2", "Barlow", sans-serif',
    body:         'Nunito',
    bodyStack:    '"Nunito", "Poppins", sans-serif',
    accent:       'Dancing Script',
    accentStack:  '"Dancing Script", cursive',
    weights:      { display: '800', body: '500', accent: '700' },
    googleFonts:  ['Exo+2:wght@600;700;800', 'Nunito:wght@400;500;600', 'Dancing+Script:wght@700'],
  },

  // ── Real Estate / Property ─────────────────────────────────────────────────
  // Reference: Prestige Realty, RichBoss Realty, D Prince Builders
  // Feels: aspirational, premium, trustworthy
  real_estate: {
    display:      'Playfair Display',
    displayStack: '"Playfair Display", Georgia, serif',
    body:         'Montserrat',
    bodyStack:    '"Montserrat", "Poppins", sans-serif',
    accent:       'Raleway',
    accentStack:  '"Raleway", sans-serif',
    weights:      { display: '800', body: '400', accent: '600' },
    googleFonts:  ['Playfair+Display:wght@700;800;900', 'Montserrat:wght@400;500;600;700', 'Raleway:wght@500;600'],
  },

  // ── Construction / Engineering ─────────────────────────────────────────────
  // Reference: Monty Engineering, BlockPro Industries, D Prince Builders
  // Feels: strong, industrial, trustworthy
  construction: {
    display:      'Oswald',
    displayStack: '"Oswald", "Barlow Condensed", sans-serif',
    body:         'Roboto',
    bodyStack:    '"Roboto", "Open Sans", sans-serif',
    accent:       'Bebas Neue',
    accentStack:  '"Bebas Neue", "Anton", sans-serif',
    weights:      { display: '700', body: '400', accent: '400' },
    googleFonts:  ['Oswald:wght@500;600;700', 'Roboto:wght@400;500;700', 'Bebas+Neue'],
  },

  // ── Sports / Casual Sunday ─────────────────────────────────────────────────
  // Reference: Sporty Sunday, Jersey Sunday
  // Feels: energetic, fun, accessible
  sports_casual: {
    display:      'Anton',
    displayStack: '"Anton", "Bebas Neue", "Impact", sans-serif',
    body:         'Roboto',
    bodyStack:    '"Roboto", "Open Sans", sans-serif',
    accent:       'Russo One',
    accentStack:  '"Russo One", "Oswald", sans-serif',
    weights:      { display: '400', body: '700', accent: '400' },
    googleFonts:  ['Anton', 'Roboto:wght@400;700;900', 'Russo+One'],
  },

  // ── Fintech / Crypto ───────────────────────────────────────────────────────
  // Reference: JuDesk Monday, crypto daily content
  // Feels: modern, bold, trustworthy-but-exciting
  fintech_crypto: {
    display:      'Space Grotesk',
    displayStack: '"Space Grotesk", "DM Sans", sans-serif',
    body:         'Inter',
    bodyStack:    '"Inter", "Roboto", sans-serif',
    accent:       'Bebas Neue',
    accentStack:  '"Bebas Neue", "Anton", sans-serif',
    weights:      { display: '700', body: '400', accent: '400' },
    googleFonts:  ['Space+Grotesk:wght@500;600;700', 'Inter:wght@400;500;600', 'Bebas+Neue'],
  },

  // ── Default / General ──────────────────────────────────────────────────────
  default: {
    display:      'Plus Jakarta Sans',
    displayStack: '"Plus Jakarta Sans", "Poppins", sans-serif',
    body:         'Montserrat',
    bodyStack:    '"Montserrat", "Roboto", sans-serif',
    accent:       'Playfair Display',
    accentStack:  '"Playfair Display", Georgia, serif',
    weights:      { display: '800', body: '400', accent: '600' },
    googleFonts:  ['Plus+Jakarta+Sans:wght@400;500;600;700;800', 'Montserrat:wght@400;500;600;700', 'Playfair+Display:wght@600;700'],
  }
};

// ── Category detection ────────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  // More specific categories checked first
  prayer_fasting:      ['fasting', 'fast ', '21 days', '30 days', 'vigil', 'midnight', 'hour of prayer', 'intercession'],
  warfare_ministry:    ['warfare', 'war room', 'battle', 'force of', 'power', 'authority', 'dominion', 'spiritual battle'],
  worship_intimate:    ['worship', 'alone with', 'intimate', 'soaking', 'adoration', 'live concert', 'album'],
  sports_casual:       ['sport', 'jersey', 'casual sunday', 'basketball', 'football', 'soccer', 'dress down', 'athletic'],
  fintech_crypto:      ['crypto', 'bitcoin', 'fintech', 'trading', 'investment', 'forex', 'digital currency', 'defi'],
  real_estate:         ['real estate', 'property', 'realty', 'apartment', 'land sales', 'housing', 'estate developer'],
  construction:        ['construction', 'engineering', 'builders', 'concrete', 'contractor', 'infrastructure'],
  business_leadership: ['leadership', 'summit', 'entrepreneur', 'ceo', 'business conference', 'deal closer', 'career'],
  youth_energy:        ['youth', 'young adults', 'vibes', 'creativity sunday', 'campus', 'generation', 'festival', 'teens'],
  // Broader ministry categories last (more likely to false-match)
  premium_ministry:    ['conference', 'prosperity', 'thousand times', 'glory', 'anointing', 'revival', 'crusade', 'convention', 'annual'],
};

/**
 * Detect category from brief text and creative direction
 */
function detectCategory(brief = '', creativeConcept = '') {
  const text = `${brief} ${creativeConcept}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }
  return 'default';
}

/**
 * Get font tokens for a given category or brief text
 */
function getFontTokens(categoryOrBrief = 'default', creativeConcept = '') {
  // Direct category lookup
  if (FONT_PAIRINGS[categoryOrBrief]) {
    return { ...FONT_PAIRINGS[categoryOrBrief], category: categoryOrBrief };
  }
  // Auto-detect from text
  const detected = detectCategory(categoryOrBrief, creativeConcept);
  return { ...FONT_PAIRINGS[detected], category: detected };
}

/**
 * Build Google Fonts @import URL for a pairing
 */
function buildGoogleFontsImport(pairing) {
  const families = pairing.googleFonts.map(f => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Get the full font system prompt injection for n8n agents
 * Returns a formatted string to paste into agent system prompts
 */
function getFontSystemPrompt() {
  return `
---APPROVED FONT PACK (Google Fonts only — all guaranteed to render)---

Use ONLY these font pairings. Never specify fonts outside this list.

PREMIUM_MINISTRY (conferences, revivals, annual conventions):
  Display: Cinzel Decorative (weight 700)
  Body: Raleway (weight 400-700)
  Script accent: Cormorant Garamond

WARFARE_MINISTRY (war room, spiritual warfare, power services):
  Display: Oswald (weight 600-700)
  Body: Montserrat (weight 400-600)
  Impact accent: Bebas Neue

YOUTH_ENERGY (youth events, campus, creativity, festivals):
  Display: Bebas Neue
  Body: Poppins (weight 400-800)
  Warmth accent: Pacifico (one word only)

BUSINESS_LEADERSHIP (summits, conferences, entrepreneurship):
  Display: Barlow Condensed (weight 700-800)
  Body: DM Sans (weight 400-600)
  Serif contrast: Playfair Display

WORSHIP_INTIMATE (worship sessions, albums, prayer concerts):
  Display: Playfair Display (weight 400-900)
  Body: Lato (weight 300-700)
  Script accent: Dancing Script

PRAYER_FASTING (fasting programmes, prayer vigils):
  Display: Exo 2 (weight 700-800)
  Body: Nunito (weight 400-600)
  Script accent: Dancing Script

REAL_ESTATE (property, luxury homes, real estate ads):
  Display: Playfair Display (weight 700-900)
  Body: Montserrat (weight 400-700)
  Supporting: Raleway

CONSTRUCTION (engineering, builders, contractors):
  Display: Oswald (weight 600-700)
  Body: Roboto (weight 400-700)
  Impact: Bebas Neue

SPORTS_CASUAL (jersey sunday, sporty events, casual dress):
  Display: Anton
  Body: Roboto (weight 700-900)
  Impact: Russo One

FINTECH_CRYPTO (trading, bitcoin, investment content):
  Display: Space Grotesk (weight 600-700)
  Body: Inter (weight 400-600)
  Impact: Bebas Neue

DEFAULT (general use):
  Display: Plus Jakarta Sans (weight 700-800)
  Body: Montserrat (weight 400-700)
  Serif contrast: Playfair Display

RULES:
- Always specify BOTH display and body font
- Script/accent fonts: maximum ONE word per design
- Never mix more than 2 font families in a single design
- When in doubt, use DEFAULT pairing
---END APPROVED FONT PACK---
`.trim();
}

module.exports = { getFontTokens, buildGoogleFontsImport, detectCategory, getFontSystemPrompt, FONT_PAIRINGS };
