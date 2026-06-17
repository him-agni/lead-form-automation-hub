const { withRetry } = require('../utils/retry');
const airtableService = require('./airtableService');
const discordService = require('./discordService');
const sheetsService = require('./sheetsService');
const Submission = require('../models/Submission');

const DESTINATIONS = ['airtable', 'discord', 'sheets'];

const retryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

const DESTINATION_TIMEOUT_MS = 15_000;

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function sanitizeErrorMessage(message) {
  return String(message || 'Unknown error')
    .replace(/https:\/\/discord\.com\/api\/webhooks\/[^\s)]+/gi, '[redacted discord webhook]')
    .replace(/pat[a-zA-Z0-9._-]+/g, '[redacted token]')
    .slice(0, 500);
}

/**
 * Runs a single destination and returns a result object.
 * Never throws — failures are captured in the result.
 */
async function runDestination(name, fn) {
  try {
    const { result, attempts } = await withRetry(
      () => withTimeout(fn(), DESTINATION_TIMEOUT_MS, name),
      {
      ...retryOptions,
      onRetry: (attempt, err) => {
        console.warn(`[fanout] ${name} attempt ${attempt} failed: ${err.message}`);
      },
      }
    );
    return { destination: name, status: 'success', attempts, error: null, externalId: result ?? null };
  } catch (err) {
    return {
      destination: name,
      status: 'failed',
      attempts: err.attempts ?? retryOptions.maxAttempts,
      error: sanitizeErrorMessage(err.message),
      externalId: null,
    };
  }
}

/**
 * Fans out a parsed Tally submission to all three destinations in parallel.
 * Saves each result to the Submission document as it completes.
 * Returns the updated Submission document.
 *
 * @param {Object} submission - Mongoose Submission document (already saved)
 * @param {Object} fields     - flat key→value map
 * @returns {Promise<Submission>}
 */
async function fanout(submission, fields) {
  const submissionId = submission.tallySubmissionId;
  const destinationFields = { ...fields, 'Submission ID': submissionId };
  const destinationNames = DESTINATIONS.filter(name => {
    const existing = submission.destinations.find(d => d.destination === name);
    return !existing || existing.status !== 'success';
  });

  const fnMap = {
    airtable: () => airtableService.createRecord(destinationFields),
    discord: () => discordService.sendAlert(destinationFields, submissionId),
    sheets: () => sheetsService.appendRow(destinationFields, submissionId),
  };

  const tasks = destinationNames.map(name => runDestination(name, fnMap[name]));

  // Fire all three in parallel; collect results regardless of individual failures
  const results = await Promise.allSettled(tasks);

  const destinationResults = results.map(r =>
    r.status === 'fulfilled' ? r.value : { destination: 'unknown', status: 'failed', error: r.reason?.message }
  );

  // Persist per-destination outcomes
  for (const result of destinationResults) {
    const idx = submission.destinations.findIndex(d => d.destination === result.destination);
    const nextResult = { ...result, lastAttemptAt: new Date() };

    if (idx === -1) {
      submission.destinations.push(nextResult);
    } else {
      submission.destinations[idx] = nextResult;
    }
  }

  submission.overallStatus = submission.computeOverallStatus();
  await submission.save();

  return submission;
}

/**
 * Retries only the failed destinations for an existing submission.
 * Called from the dashboard "Retry" button via POST /events/:id/retry
 */
async function retryFailed(submission) {
  const fields = Object.fromEntries(submission.fields);
  const submissionId = submission.tallySubmissionId;
  const destinationFields = { ...fields, 'Submission ID': submissionId };

  const failedNames = submission.destinations
    .filter(d => d.status === 'failed')
    .map(d => d.destination);

  if (!failedNames.length) return submission;

  const fnMap = {
    airtable: () => airtableService.createRecord(destinationFields),
    discord: () => discordService.sendAlert(destinationFields, submissionId),
    sheets: () => sheetsService.appendRow(destinationFields, submissionId),
  };

  const tasks = failedNames.map(name => runDestination(name, fnMap[name]));
  const results = await Promise.allSettled(tasks);

  const retried = results.map(r =>
    r.status === 'fulfilled' ? r.value : { destination: 'unknown', status: 'failed', error: r.reason?.message }
  );

  // Merge retried results back into existing destinations array
  for (const retryResult of retried) {
    const idx = submission.destinations.findIndex(d => d.destination === retryResult.destination);
    if (idx !== -1) {
      submission.destinations[idx] = { ...retryResult, lastAttemptAt: new Date() };
    }
  }

  submission.overallStatus = submission.computeOverallStatus();
  await submission.save();

  return submission;
}

async function recoverProcessingSubmissions() {
  const stuckSubmissions = await Submission.find({ overallStatus: 'processing' });

  if (!stuckSubmissions.length) return 0;

  console.warn(`[fanout] Recovering ${stuckSubmissions.length} processing submission(s)`);

  for (const submission of stuckSubmissions) {
    const fields = Object.fromEntries(submission.fields);
    fanout(submission, fields).catch(err =>
      console.error(`[fanout] Recovery failed for submission ${submission._id}:`, err)
    );
  }

  return stuckSubmissions.length;
}

module.exports = { fanout, retryFailed, recoverProcessingSubmissions, DESTINATIONS };
