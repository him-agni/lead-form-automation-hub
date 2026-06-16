const express = require('express');
const router = express.Router();
const { listEvents, getEvent, retryEvent, getStats } = require('../controllers/eventController');

router.get('/stats', getStats);
router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/:id/retry', retryEvent);

module.exports = router;
