# Google Sheets Service Account Setup

This is the integration most people get stuck on. A service account is a "robot user" — it has its own email address and you grant it access to a specific sheet, the same way you'd share a sheet with a colleague.

## 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or reuse one) — e.g. `form-automation-hub`

## 2. Enable the Sheets API

1. In the project, go to **APIs & Services → Library**
2. Search for "Google Sheets API" → click **Enable**

## 3. Create a service account

1. **APIs & Services → Credentials → Create Credentials → Service account**
2. Name it (e.g. `sheets-writer`)
3. No roles needed at the project level — access is granted per-sheet in step 5
4. Click **Done**

## 4. Generate a JSON key

1. Click into the service account you just created
2. **Keys → Add Key → Create new key → JSON**
3. This downloads a `.json` file — treat it like a password, never commit it

## 5. Share your Google Sheet with the service account

Open the downloaded JSON and find the `client_email` field — it looks like:

```
sheets-writer@form-automation-hub.iam.gserviceaccount.com
```

1. Open your target Google Sheet
2. Click **Share**
3. Paste that email address, give it **Editor** access
4. Uncheck "Notify people" (it's a robot, it won't read the email)

> Skipping this step is the #1 cause of `PERMISSION_DENIED` errors — the API key being valid doesn't matter if the sheet itself was never shared with the service account.

## 6. Add the credentials to `.env`

The entire JSON file needs to be one line in `.env`. Easiest way:

```bash
node -e "console.log(JSON.stringify(require('./path/to/downloaded-key.json')))"
```

Paste the output as the value:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...", ...}
```

## 7. Get your Sheet ID

From the sheet's URL:

```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
```

```
GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

## 8. Verify

Run **Simulate** from the dashboard. A new row should append to `Sheet1` columns A–F (Timestamp, Submission ID, Name, Email, Company, Message).

## Common errors

| Error | Cause |
|---|---|
| `PERMISSION_DENIED` | Sheet not shared with the service account email (step 5) |
| `invalid_grant: account not found` | JSON key was revoked/deleted in Cloud Console |
| `Unable to parse range: Sheet1!A:F` | Your sheet's tab isn't named `Sheet1` — rename it or edit the range in [sheetsService.js](../server/services/sheetsService.js) |
| `SyntaxError` on server start | `GOOGLE_SERVICE_ACCOUNT_JSON` isn't valid single-line JSON — re-run the `node -e` command in step 6 |
