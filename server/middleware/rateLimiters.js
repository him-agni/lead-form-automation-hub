const rateLimit = require('express-rate-limit');

const dashboardReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many dashboard requests, please try again shortly' },
});

const dashboardWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests, please try again shortly' },
});

const tallyWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests, please try again shortly' },
});

module.exports = {
  dashboardReadLimiter,
  dashboardWriteLimiter,
  tallyWebhookLimiter,
};
