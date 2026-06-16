const Submission = require('../models/Submission');
const { retryFailed } = require('../services/fanoutService');

/** GET /events — paginated list of submissions, newest first */
async function listEvents(req, res) {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  const [submissions, total] = await Promise.all([
    Submission.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Submission.countDocuments(),
  ]);

  res.json({ submissions, total, page, pages: Math.ceil(total / limit) });
}

/** GET /events/:id — single submission detail */
async function getEvent(req, res) {
  const submission = await Submission.findById(req.params.id).lean();
  if (!submission) return res.status(404).json({ error: 'Not found' });
  res.json(submission);
}

/** POST /events/:id/retry — retry only failed destinations */
async function retryEvent(req, res) {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: 'Not found' });

  const failedCount = submission.destinations.filter(d => d.status === 'failed').length;
  if (failedCount === 0) {
    return res.status(400).json({ error: 'No failed destinations to retry' });
  }

  const updated = await retryFailed(submission);
  res.json(updated);
}

/** GET /events/stats — summary counts for the integration health panel */
async function getStats(req, res) {
  const [total, success, partial, failed, processing] = await Promise.all([
    Submission.countDocuments(),
    Submission.countDocuments({ overallStatus: 'success' }),
    Submission.countDocuments({ overallStatus: 'partial_failure' }),
    Submission.countDocuments({ overallStatus: 'failed' }),
    Submission.countDocuments({ overallStatus: 'processing' }),
  ]);

  // Per-destination failure counts
  const destinationStats = await Submission.aggregate([
    { $unwind: '$destinations' },
    {
      $group: {
        _id: { destination: '$destinations.destination', status: '$destinations.status' },
        count: { $sum: 1 },
      },
    },
  ]);

  res.json({ total, success, partial, failed, processing, destinationStats });
}

module.exports = { listEvents, getEvent, retryEvent, getStats };
