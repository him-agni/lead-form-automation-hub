const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTallyPayload } = require('../services/tallyService');

test('parseTallyPayload flattens fields and extracts metadata', () => {
  const parsed = parseTallyPayload({
    data: {
      responseId: 'resp_123',
      respondentId: 'respondent_123',
      formId: 'form_123',
      fields: [
        { key: 'name', label: 'Name', value: 'Jane Doe' },
        { key: 'email', label: 'Email', value: 'jane@example.com' },
      ],
    },
  });

  assert.equal(parsed.tallySubmissionId, 'resp_123');
  assert.equal(parsed.respondentId, 'respondent_123');
  assert.equal(parsed.tallyFormId, 'form_123');
  assert.deepEqual(parsed.fields, {
    Name: 'Jane Doe',
    Email: 'jane@example.com',
  });
});

test('parseTallyPayload rejects payloads without submission ids', () => {
  assert.throws(
    () => parseTallyPayload({ data: { fields: [] } }),
    /responseId or submissionId/
  );
});

test('parseTallyPayload rejects non-array fields', () => {
  assert.throws(
    () => parseTallyPayload({ data: { responseId: 'resp_123', fields: {} } }),
    /fields must be an array/
  );
});
