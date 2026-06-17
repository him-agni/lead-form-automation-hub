const REQUIRED_ALWAYS = ['MONGODB_URI'];

const REQUIRED_IN_PRODUCTION = [
  'CLIENT_URL',
  'DASHBOARD_API_KEY',
  'TALLY_SIGNING_SECRET',
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_TABLE_NAME',
  'DISCORD_WEBHOOK_URL',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SHEET_ID',
];

function validateGoogleCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return;

  try {
    JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON');
  }
}

function validateEnv() {
  const missingAlways = REQUIRED_ALWAYS.filter(key => !process.env[key]);
  if (missingAlways.length) {
    throw new Error(`Missing required environment variable(s): ${missingAlways.join(', ')}`);
  }

  validateGoogleCredentials();

  const missingProduction = REQUIRED_IN_PRODUCTION.filter(key => !process.env[key]);
  if (process.env.NODE_ENV === 'production' && missingProduction.length) {
    throw new Error(`Missing production environment variable(s): ${missingProduction.join(', ')}`);
  }

  if (process.env.NODE_ENV !== 'production' && missingProduction.length) {
    console.warn(`[env] Optional dev/demo variable(s) not set: ${missingProduction.join(', ')}`);
  }
}

module.exports = { validateEnv };
