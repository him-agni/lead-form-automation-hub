const crypto = require('crypto');

/**
 * Validates the HMAC-SHA256 signature Tally sends in the
 * `Tally-Signature` request header using your form's signing secret.
 *
 * Tally signs the raw request body: HMAC-SHA256(signingSecret, rawBody)
 * and sends the base64 digest as the header value (Express lowercases
 * the header name to `tally-signature` on req.headers).
 *
 * We use express.raw() on the webhook route so rawBody is available.
 */
function verifyTallySignature(req, res, next) {
  const signingSecret = process.env.TALLY_SIGNING_SECRET;

  // Skip verification only in local dev/demo mode.
  if (!signingSecret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Tally signing secret is not configured' });
    }

    console.warn('[webhook] TALLY_SIGNING_SECRET not set — skipping signature check');
    return next();
  }

  const incomingSignature = req.headers['tally-signature'];
  if (!incomingSignature) {
    return res.status(401).json({ error: 'Missing Tally-Signature header' });
  }

  const rawBody = req.body; // Buffer from express.raw()
  const expectedSignature = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody)
    .digest('base64');

  const incoming = Buffer.from(incomingSignature, 'base64');
  const expected = Buffer.from(expectedSignature, 'base64');

  const trusted = incoming.length === expected.length && crypto.timingSafeEqual(incoming, expected);

  if (!trusted) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Re-parse body as JSON for downstream handlers
  try {
    req.body = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  next();
}

module.exports = verifyTallySignature;
