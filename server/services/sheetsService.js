const { google } = require('googleapis');

function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
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

  const values = [
    new Date().toISOString(),
    submissionId,
    fields['Name'] || fields['Full Name'] || '',
    fields['Email'] || fields['Email Address'] || '',
    fields['Company'] || fields['Company Name'] || '',
    fields['Message'] || fields['Notes'] || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

module.exports = { appendRow };
