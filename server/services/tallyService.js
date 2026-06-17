/**
 * Parses a raw Tally webhook payload into a flat key→value fields map
 * and extracts submission metadata.
 *
 * Tally payloads look like:
 * {
 *   eventId, createdAt, data: {
 *     responseId, submissionId, respondentId, formId, formName,
 *     fields: [{ key, label, type, value }]
 *   }
 * }
 */
function parseTallyPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Payload must be a JSON object');
  }

  const { data } = raw;
  if (!data || typeof data !== 'object') {
    throw new Error('Payload is missing data');
  }

  if (!data.responseId && !data.submissionId) {
    throw new Error('Payload is missing responseId or submissionId');
  }

  if (!Array.isArray(data.fields)) {
    throw new Error('Payload data.fields must be an array');
  }

  const fields = {};
  for (const field of data.fields) {
    if (!field || typeof field !== 'object') continue;

    // Use label as key for human readability; fall back to key
    const name = field.label || field.key;
    if (!name) continue;

    fields[name] = field.value;
  }

  return {
    tallyFormId: data.formId,
    tallySubmissionId: data.responseId || data.submissionId,
    respondentId: data.respondentId,
    fields,
  };
}

module.exports = { parseTallyPayload };
