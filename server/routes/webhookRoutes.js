const express = require('express');
const router = express.Router();
const verifyTallySignature = require('../middleware/verifyTallySignature');
const { handleTallyWebhook, simulateSubmission } = require('../controllers/tallyController');

// Tally sends raw JSON; we read the raw body for HMAC verification
router.post(
  '/tally',
  express.raw({ type: 'application/json' }),
  verifyTallySignature,
  handleTallyWebhook
);

// Simulate endpoint does NOT need signature verification
router.post('/simulate', express.json(), simulateSubmission);

module.exports = router;
