const express = require('express');
const router = express.Router();
const verifyTallySignature = require('../middleware/verifyTallySignature');
const requireDashboardAuth = require('../middleware/requireDashboardAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { dashboardWriteLimiter, tallyWebhookLimiter } = require('../middleware/rateLimiters');
const { handleTallyWebhook, simulateSubmission } = require('../controllers/tallyController');

// Tally sends raw JSON; we read the raw body for HMAC verification
router.post(
  '/tally',
  tallyWebhookLimiter,
  express.raw({ type: 'application/json', limit: '256kb' }),
  verifyTallySignature,
  asyncHandler(handleTallyWebhook)
);

// Simulate endpoint does NOT need signature verification
router.post('/simulate', requireDashboardAuth, dashboardWriteLimiter, asyncHandler(simulateSubmission));

module.exports = router;
