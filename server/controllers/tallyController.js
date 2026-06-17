const { parseTallyPayload } = require('../services/tallyService');
const { fanout, DESTINATIONS } = require('../services/fanoutService');
const Submission = require('../models/Submission');

const MAX_SIMULATE_FIELD_LENGTH = 500;

function cleanSimulateValue(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.slice(0, MAX_SIMULATE_FIELD_LENGTH) || fallback;
}

function normalizeSimulateBody(body = {}) {
  const email = cleanSimulateValue(body.email, 'jane@example.com');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    const err = new Error('Email must be a valid email address');
    err.statusCode = 400;
    throw err;
  }

  return {
    name: cleanSimulateValue(body.name, 'Jane Doe'),
    email,
    company: cleanSimulateValue(body.company, 'Acme Corp'),
    message: cleanSimulateValue(body.message, 'Interested in a demo.'),
  };
}

/**
 * POST /webhooks/tally
 * Receives a Tally form submission, persists it immediately,
 * then fans out to all destinations with retry.
 */
async function handleTallyWebhook(req, res) {
  let parsed;
  try {
    parsed = parseTallyPayload(req.body);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse Tally payload', detail: err.message });
  }

  // Deduplicate: Tally can send the same submission twice on retries
  const existing = await Submission.findOne({ tallySubmissionId: parsed.tallySubmissionId });
  if (existing) {
    return res.status(200).json({ message: 'Already processed', id: existing._id });
  }

  // Save immediately so the dashboard shows the submission even before fanout completes
  const submission = await Submission.create({
    ...parsed,
    overallStatus: 'processing',
    destinations: DESTINATIONS.map(destination => ({ destination, status: 'pending' })),
  });

  // Respond to Tally quickly — fanout runs in background
  res.status(202).json({ message: 'Accepted', id: submission._id });

  // Non-blocking fanout with retry
  fanout(submission, parsed.fields).catch(err =>
    console.error(`[webhook] Fanout error for submission ${submission._id}:`, err)
  );
}

/**
 * POST /webhooks/simulate
 * Fires a synthetic submission so the dashboard can be demoed
 * without a real Tally form.
 */
async function simulateSubmission(req, res) {
  const now = Date.now();
  const input = normalizeSimulateBody(req.body);
  const synthetic = {
    eventId: `sim_${now}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `sim_resp_${now}`,
      submissionId: `sim_sub_${now}`,
      respondentId: `sim_respondent_${now}`,
      formId: 'simulated_form',
      formName: 'Demo Form',
      fields: [
        { key: 'name', label: 'Name', type: 'INPUT_TEXT', value: input.name },
        { key: 'email', label: 'Email', type: 'INPUT_EMAIL', value: input.email },
        { key: 'company', label: 'Company', type: 'INPUT_TEXT', value: input.company },
        { key: 'message', label: 'Message', type: 'TEXTAREA', value: input.message },
      ],
    },
  };

  const parsed = parseTallyPayload(synthetic);
  const submission = await Submission.create({
    ...parsed,
    overallStatus: 'processing',
    destinations: DESTINATIONS.map(destination => ({ destination, status: 'pending' })),
    simulatedAt: new Date(),
  });

  res.status(202).json({ message: 'Simulation started', id: submission._id });

  fanout(submission, parsed.fields).catch(err =>
    console.error(`[simulate] Fanout error:`, err)
  );
}

module.exports = { handleTallyWebhook, simulateSubmission };
