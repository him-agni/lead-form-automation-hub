const Airtable = require('airtable');

function escapeAirtableFormulaValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getBase() {
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
  );
}

/**
 * Creates a new record in the configured Airtable table.
 * @param {Object} fields - flat key→value map from the Tally submission
 * @returns {string} created record ID
 */
async function createRecord(fields) {
  const base = getBase();
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Submissions';
  const submissionId = fields['Submission ID'] || '';

  if (submissionId) {
    const existing = await base(tableName)
      .select({
        maxRecords: 1,
        filterByFormula: `{Submission ID} = '${escapeAirtableFormulaValue(submissionId)}'`,
      })
      .firstPage();

    if (existing.length > 0) {
      return existing[0].getId();
    }
  }

  // Airtable field names must match your base exactly — map them here
  const record = await base(tableName).create({
    'Submission ID': submissionId,
    Name: fields['Name'] || fields['Full Name'] || '',
    Email: fields['Email'] || fields['Email Address'] || '',
    Company: fields['Company'] || fields['Company Name'] || '',
    Message: fields['Message'] || fields['Notes'] || '',
    'Submitted At': new Date().toISOString(),
    Source: 'Tally',
  });

  return record.getId();
}

module.exports = { createRecord };
