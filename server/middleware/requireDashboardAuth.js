const crypto = require('crypto');

function timingSafeStringEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function requireDashboardAuth(req, res, next) {
  const expectedKey = process.env.DASHBOARD_API_KEY;

  if (!expectedKey) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Dashboard API key is not configured' });
    }

    console.warn('[auth] DASHBOARD_API_KEY not set - dashboard API auth is disabled');
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const suppliedKey = bearerToken || req.headers['x-dashboard-api-key'];

  if (!suppliedKey || !timingSafeStringEqual(suppliedKey, expectedKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireDashboardAuth;
