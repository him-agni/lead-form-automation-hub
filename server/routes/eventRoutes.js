const express = require('express');
const router = express.Router();
const { listEvents, getEvent, retryEvent, getStats } = require('../controllers/eventController');
const requireDashboardAuth = require('../middleware/requireDashboardAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { dashboardReadLimiter, dashboardWriteLimiter } = require('../middleware/rateLimiters');

router.use(requireDashboardAuth);

router.get('/stats', dashboardReadLimiter, asyncHandler(getStats));
router.get('/', dashboardReadLimiter, asyncHandler(listEvents));
router.get('/:id', dashboardReadLimiter, asyncHandler(getEvent));
router.post('/:id/retry', dashboardWriteLimiter, asyncHandler(retryEvent));

module.exports = router;
