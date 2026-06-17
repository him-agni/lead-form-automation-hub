const { google } = require('googleapis');

function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function submissionAlreadyLogged(sheets, spreadsheetId, submissionId) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Sheet1!B:B',
  });

  const rows = existing.data.values || [];
  return rows.some(row => row[0] === submissionId);
}

function sanitizeForSheets(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/**
 * Appends a row to the configured Google Sheet.
 * Columns: Timestamp | Submission ID | Name | Email | Company | Message
 * @param {Object} fields - flat key→value map from the Tally submission
 * @param {string} submissionId
 */
async function appendRow(fields, submissionId) {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (await submissionAlreadyLogged(sheets, spreadsheetId, submissionId)) {
    return submissionId;
  }

  const values = [
    new Date().toISOString(),
    submissionId,
    fields['Name'] || fields['Full Name'] || '',
    fields['Email'] || fields['Email Address'] || '',
    fields['Company'] || fields['Company Name'] || '',
    fields['Message'] || fields['Notes'] || '',
  ].map(sanitizeForSheets);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A:F',
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  });
}

module.exports = { appendRow };
