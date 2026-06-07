/**
 * Validates the render request payload before it hits the renderer.
 * Returns 400 with a clear error message if required fields are missing.
 */
function validatePayload(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body must be JSON.' });
  }

  // copy is required — can't render without any text
  if (!body.copy || typeof body.copy !== 'object') {
    return res.status(400).json({
      error: 'Missing required field: copy (object with headline, subheadline, cta_text)'
    });
  }

  if (!body.copy.headline) {
    return res.status(400).json({ error: 'Missing required field: copy.headline' });
  }

  if (!body.copy.cta_text) {
    return res.status(400).json({ error: 'Missing required field: copy.cta_text' });
  }

  // layout defaults if not provided
  if (!body.layout) {
    body.layout = { canvas_width: 1200, canvas_height: 1200 };
  }

  // brand defaults if not provided
  if (!body.brand) {
    body.brand = {};
  }

  // creative_direction defaults
  if (!body.creative_direction) {
    body.creative_direction = {};
  }

  // /render/patch: failing_dimensions must be an array
  if (req.path === '/render/patch') {
    if (!Array.isArray(body.failing_dimensions) || body.failing_dimensions.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: failing_dimensions (non-empty array)'
      });
    }
  }

  next();
}

module.exports = { validatePayload };
