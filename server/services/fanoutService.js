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

/**
 * Runs a single destination and returns a result object.
 * Never throws — failures are captured in the result.
 */
async function runDestination(name, fn) {
  try {
    const { result, attempts } = await withRetry(fn, {
      ...retryOptions,
      onRetry: (attempt, err) => {
        console.warn(`[fanout] ${name} attempt ${attempt} failed: ${err.message}`);
      },
    });
    return { destination: name, status: 'success', attempts, error: null, externalId: result ?? null };
  } catch (err) {
    return {
      destination: name,
      status: 'failed',
      attempts: err.attempts ?? retryOptions.maxAttempts,
      error: err.message,
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

  const tasks = [
    runDestination('airtable', () => airtableService.createRecord(fields)),
    runDestination('discord', () => discordService.sendAlert(fields, submissionId)),
    runDestination('sheets', () => sheetsService.appendRow(fields, submissionId)),
  ];

  // Fire all three in parallel; collect results regardless of individual failures
  const results = await Promise.allSettled(tasks);

  const destinationResults = results.map(r =>
    r.status === 'fulfilled' ? r.value : { destination: 'unknown', status: 'failed', error: r.reason?.message }
  );

  // Persist per-destination outcomes
  submission.destinations = destinationResults.map(r => ({
    ...r,
    lastAttemptAt: new Date(),
  }));
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

  const failedNames = submission.destinations
    .filter(d => d.status === 'failed')
    .map(d => d.destination);

  if (!failedNames.length) return submission;

  const fnMap = {
    airtable: () => airtableService.createRecord(fields),
    discord: () => discordService.sendAlert(fields, submissionId),
    sheets: () => sheetsService.appendRow(fields, submissionId),
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

module.exports = { fanout, retryFailed, DESTINATIONS };
