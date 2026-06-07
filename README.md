# Ad Composition Renderer

A Puppeteer-based microservice that converts AI design packages into pixel-precise PNG ads. Part of the AI Designer n8n pipeline.

## What it does

Accepts a JSON design package from n8n, generates HTML/CSS from it, screenshots it with Puppeteer at exact dimensions, and returns a base64 PNG. This is what makes the typography, layout, and CTA crisp — nothing is drawn by an image generator.

## Architecture

```
n8n Layout Agent
       │ JSON design package
       ▼
POST /render ──────────────────► Template Engine
                                  │ generates HTML/CSS
                                  ▼
                             Puppeteer
                                  │ screenshots at exact px
                                  ▼
                             PNG buffer → base64
                                  │
       ◄──────────────────────────┘
       n8n Design Critic Agent
```

## Endpoints

### `POST /render`
Renders a single ad at the specified dimensions.

**Request:**
```json
{
  "brand": {
    "brand_name": "Nubiq",
    "primary_color": "#0D1F18",
    "accent_color": "#10B981",
    "bg_color": "#0D1F18",
    "font_display": "Plus Jakarta Sans",
    "font_body": "Plus Jakarta Sans",
    "logo_url": "https://your-cdn.com/logo.png"
  },
  "layout": {
    "canvas_width": 1200,
    "canvas_height": 1200,
    "headline_font_size": "72px",
    "safe_zone_padding": "60px",
    "headline_slot": { "max_chars": 28 },
    "subheadline_slot": { "max_chars": 60 },
    "cta_slot": { "max_chars": 20 }
  },
  "copy": {
    "headline": "Say hello to Nubiq",
    "subheadline": "The smarter way to move your money",
    "body_copy": "Fast transfers, airtime, bills and savings.",
    "cta_text": "Download Now",
    "tagline": "FINTECH · REDESIGNED"
  },
  "hero_image_url": "https://recraft-generated-cutout.png",
  "creative_direction": {
    "color_primary": "#0D1F18",
    "color_accent": "#10B981",
    "typography_heading": "Plus Jakarta Sans",
    "typography_body": "Plus Jakarta Sans"
  }
}
```

**Response:**
```json
{
  "success": true,
  "image_base64": "iVBORw0KGgo...",
  "image_data_url": "data:image/png;base64,iVBORw0KGgo...",
  "width": 1200,
  "height": 1200,
  "format": "png",
  "render_time_ms": 1240
}
```

---

### `POST /render/variants`
Renders all platform sizes from one design package.

Add `"variants": ["1:1", "9:16"]` to limit which ratios are generated.
Omit `variants` to generate all 8 platform sizes.

**Response:**
```json
{
  "success": true,
  "variants": {
    "facebook_feed":       { "width": 1200, "height": 1200, "image_base64": "..." },
    "instagram_story":     { "width": 1080, "height": 1920, "image_base64": "..." },
    "linkedin_post":       { "width": 1200, "height": 627,  "image_base64": "..." }
  },
  "count": 8
}
```

---

### `POST /render/patch`
Surgical revision — re-renders only the failing dimensions without regenerating the hero image. Called by the revision loop when Design Critic score < 8.

Add to the standard request body:
```json
{
  "failing_dimensions": ["typography", "cta_clarity"],
  "specific_fixes": {
    "typography": "Increase headline weight to 800. Reduce body copy to 11px.",
    "cta_clarity": "Change CTA background to brand primary. Increase padding."
  }
}
```

---

### `GET /health`
Returns `{ "status": "ok" }`. Use this as your n8n health check URL.

---

## Setup

### Local development

```bash
cp .env.example .env
# Edit .env with your API_KEY
npm install
npm run dev
```

### Docker (recommended for production)

```bash
docker build -t ad-renderer .
docker run -p 3000:3000 --env-file .env ad-renderer
```

### Deploy to Render.com (easiest)

1. Push this folder to a GitHub repo
2. New Web Service → connect repo
3. Runtime: Docker
4. Add env vars: `API_KEY`, `PORT=3000`
5. Done — you get a public HTTPS URL

### Deploy to Railway

```bash
railway init
railway up
railway variables set API_KEY=your-secret PORT=3000
```

---

## n8n Integration

### Step 1: Replace the DALL-E image node

In your n8n workflow, after the Layout Planner Agent, add an **HTTP Request** node:

- Method: `POST`
- URL: `https://your-renderer.onrender.com/render`
- Headers: `x-api-key: your-secret-key`, `Content-Type: application/json`
- Body (JSON):
```json
{
  "brand": "={{ $('Brand Memory Node').item.json }}",
  "layout": "={{ $('Layout Planner Agent').item.json }}",
  "copy": "={{ $('Copywriter Agent').item.json }}",
  "hero_image_url": "={{ $('Generate Hero Asset').item.json.url }}",
  "creative_direction": "={{ $('Creative Director Agent').item.json }}"
}
```

### Step 2: Use /render/patch in the revision loop

When Design Critic score < 8, call `/render/patch` instead of regenerating via DALL-E:

```json
{
  "brand": "={{ $('Brand Memory Node').item.json }}",
  "layout": "={{ $('Layout Planner Agent').item.json }}",
  "copy": "={{ $('Copywriter Agent').item.json }}",
  "hero_image_url": "={{ $('Generate Hero Asset').item.json.url }}",
  "creative_direction": "={{ $('Creative Director Agent').item.json }}",
  "failing_dimensions": "={{ $('Design Critic Agent').item.json.failing_dimensions }}",
  "specific_fixes": "={{ $('Design Critic Agent').item.json.specific_fixes }}"
}
```

### Step 3: Call /render/variants after approval

When score ≥ 8, call `/render/variants` to get all platform sizes in one request.

---

## Platform dimensions

| Platform | Size | Ratio | Template |
|---|---|---|---|
| Facebook Feed | 1200×1200 | 1:1 | square |
| Facebook Story | 1080×1920 | 9:16 | vertical |
| Instagram Post | 1080×1080 | 1:1 | square |
| Instagram Story | 1080×1920 | 9:16 | vertical |
| Instagram Landscape | 1080×566 | 1.91:1 | landscape |
| LinkedIn Post | 1200×627 | 1.91:1 | landscape |
| Twitter/X | 1600×900 | 16:9 | landscape |
| TikTok | 1080×1920 | 9:16 | vertical |

---

## Extending the templates

Templates live in `src/templates/engine.js`. Each template is a plain JS function that returns an HTML string. To add a new template:

1. Write a new function: `function myTemplate({ tokens, copy, layout, hero_image_url, width, height })`
2. Return an HTML string (no `<html>`, `<head>`, or `<body>` — those are in `buildDocument`)
3. Add it to the ratio routing in `generateTemplate()`

The CSS variable system (`--color-primary`, `--color-accent`, etc.) is available in all templates — use them and the output will automatically reflect brand tokens.
