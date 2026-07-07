# Lead & Form Automation Hub

Receives Tally form submissions via webhook and fans them out in parallel to Airtable, Discord, and Google Sheets — with per-destination retry and a live dashboard to watch it happen.

<img width="1410" height="872" alt="image" src="https://github.com/user-attachments/assets/2f82daa5-3c71-4809-95c0-7a46c69814d8" />


```
Tally form submission
        │
        ▼
POST /webhooks/tally  (Express, HMAC-verified)
        │
        ├──► Airtable        (new record)
        ├──► Discord         (team alert embed)
        └──► Google Sheets   (logged row)

Each destination retries independently (exponential backoff, 3 attempts)
and reports success/failure back to the dashboard.
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind + React Query |
| Backend | Node.js + Express |
| Database | MongoDB (event log + per-destination status) |
| Forms | Tally (webhooks) |
| CRM | Airtable (REST API) |
| Alerts | Discord (incoming webhook) |
| Logging | Google Sheets API v4 (service account) |

## Quick start

Full walkthrough in [docs/SETUP.md](docs/SETUP.md). Short version:

```bash
# 1. Install
cd server && npm install
cd ../client && npm install

# 2. Configure
cp .env.example server/.env   # fill in real keys — see docs/
cp client/.env.example client/.env
# set DASHBOARD_API_KEY and VITE_DASHBOARD_API_KEY to the same long random value

# 3. Run (two terminals)
cd server && npm run dev
cd client && npm run dev
```

Open `http://localhost:5173`, click **Fire Test Submission** in the sidebar — no real Tally form or ngrok needed to see the full pipeline run.

## Docs

- [SETUP.md](docs/SETUP.md) — end-to-end setup + troubleshooting
- [TALLY_WEBHOOK.md](docs/TALLY_WEBHOOK.md) — form + webhook + signature verification
- [AIRTABLE_SETUP.md](docs/AIRTABLE_SETUP.md) — base, table, personal access token
- [GOOGLE_AUTH.md](docs/GOOGLE_AUTH.md) — service account setup (the tricky one)
- [API_REFERENCE.md](docs/API_REFERENCE.md) — every endpoint + the Submission schema
- [postman/Form-Automation-Hub.json](postman/Form-Automation-Hub.json) — importable Postman collection

## Key design points

- **Per-destination retry, not all-or-nothing.** If Discord is down but Airtable and Sheets succeed, only Discord gets retried — see [fanoutService.js](server/services/fanoutService.js).
- **Webhook signature verification.** Tally requests are validated with a constant-time HMAC-SHA256 comparison before being processed — see [verifyTallySignature.js](server/middleware/verifyTallySignature.js).
- **Dedup on redelivery.** Tally retries webhooks on timeout; submissions are deduped by `tallySubmissionId` so retries don't create duplicate Airtable/Sheets rows.
- **Simulate without Tally.** The dashboard can fire synthetic submissions through the real fanout pipeline, so the whole flow is demoable without a live form or ngrok tunnel.
