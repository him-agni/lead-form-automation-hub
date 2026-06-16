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
  const { data } = raw;

  const fields = {};
  for (const field of data.fields || []) {
    // Use label as key for human readability; fall back to key
    const name = field.label || field.key;
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
