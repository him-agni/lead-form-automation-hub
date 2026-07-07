# Project Handoff

Last reviewed: 2026-07-07

## Overview

Lead & Form Automation Hub is a full-stack demo/utility for receiving Tally form submissions, recording them in MongoDB, and fanning each submission out to Airtable, Discord, and Google Sheets. It also includes a React dashboard for watching submission status, simulating submissions, and retrying failed destinations.

The core value of the project is the resilient fanout pattern: every destination is attempted independently, retried independently, and persisted with its own status so one flaky integration does not block the others.

## Repository Map

```text
.
├── client/                 React + Vite + Tailwind dashboard
│   ├── src/components/     Dashboard panels and cards
│   ├── src/hooks/          React Query hooks
│   ├── src/pages/          Dashboard page shell
│   └── src/services/api.js API client
├── server/                 Express API and integration workers
│   ├── config/             Environment validation
│   ├── controllers/        Request handlers
│   ├── middleware/         Auth, rate limits, webhook signature, errors
│   ├── models/             Mongoose Submission schema
│   ├── routes/             Webhook and event routes
│   ├── services/           Tally parser and downstream integrations
│   ├── test/               Node test runner unit tests
│   └── utils/              Retry helper
├── docs/                   Setup and integration references
├── postman/                Importable API collection
└── .env.example            Server environment template
```

## Runtime Architecture

```text
Tally or dashboard simulator
        |
        v
Express server
        |
        v
MongoDB Submission document, initially processing
        |
        v
fanoutService runs destinations in parallel
        |
        +--> Airtable record
        +--> Discord webhook alert
        +--> Google Sheets row
        |
        v
Submission document updated with per-destination results
        |
        v
React dashboard polls /events and /events/stats every 5 seconds
```

## Main Backend Flow

1. `server/index.js` loads `.env`, validates environment, connects MongoDB, registers routes, and starts Express.
2. `POST /webhooks/tally` uses `express.raw()` so `verifyTallySignature.js` can validate Tally's HMAC over the original request bytes.
3. `tallyController.handleTallyWebhook` parses the Tally payload through `tallyService.parseTallyPayload`.
4. Duplicate real webhook deliveries are deduped by `tallySubmissionId`.
5. A `Submission` document is created immediately with `overallStatus: "processing"` and one pending destination result for each configured destination.
6. The API returns `202 Accepted` quickly.
7. `fanoutService.fanout` runs Airtable, Discord, and Sheets in parallel with retry and timeout guards.
8. Destination results are saved back onto the same Mongo document, and `computeOverallStatus()` derives the final status.

The simulator endpoint, `POST /webhooks/simulate`, skips Tally signature verification but otherwise creates a synthetic Tally-shaped payload and uses the same parser and fanout path.

## Important Backend Files

- `server/index.js`: application bootstrap, CORS, body parsing split between webhook and non-webhook routes, Mongo connection, processing recovery on startup.
- `server/controllers/tallyController.js`: real webhook ingestion and simulator endpoint.
- `server/controllers/eventController.js`: dashboard event listing, detail, retry, and stats endpoints.
- `server/models/Submission.js`: Mongo schema and `computeOverallStatus`.
- `server/services/fanoutService.js`: central orchestration for parallel fanout, retry, timeout, redacted errors, retrying failed destinations, and recovering stuck processing submissions after restart.
- `server/services/tallyService.js`: normalizes Tally payloads into a flat `{ label: value }` field map.
- `server/services/airtableService.js`: creates or reuses an Airtable record keyed by `Submission ID`.
- `server/services/discordService.js`: sends a Discord embed through an incoming webhook.
- `server/services/sheetsService.js`: appends rows to `Sheet1!A:F` and avoids duplicate rows by checking column B for the submission ID.
- `server/utils/retry.js`: generic exponential backoff helper.

## Main Frontend Flow

The client is a single dashboard screen rendered from `client/src/App.jsx`.

- `Dashboard.jsx` lays out the feed and sidebar.
- `EventFeed.jsx` paginates and displays submissions.
- `SubmissionCard.jsx` masks sensitive-looking fields, shows destination pills, and exposes retry when any destination failed.
- `IntegrationStatus.jsx` shows aggregate totals and per-destination health.
- `SimulateForm.jsx` posts synthetic submission data to the backend.
- `hooks/useSubmissions.js` uses React Query to poll submissions and stats every 5 seconds.
- `services/api.js` creates an Axios client and sends `Authorization: Bearer <VITE_DASHBOARD_API_KEY>` when configured.

## Data Model

`Submission` is the central persisted entity.

Key fields:

- `tallyFormId`: Tally form ID.
- `tallySubmissionId`: unique response/submission ID used for deduplication.
- `respondentId`: Tally respondent ID.
- `fields`: flat map of Tally field labels to values.
- `overallStatus`: one of `processing`, `success`, `partial_failure`, or `failed`.
- `destinations`: array of Airtable, Discord, and Sheets result objects.
- `simulatedAt`: set only for dashboard-generated test submissions.
- `createdAt` / `updatedAt`: Mongoose timestamps.

Destination result fields:

- `destination`: `airtable`, `discord`, or `sheets`.
- `status`: `pending`, `success`, or `failed`.
- `attempts`: number of attempts used by retry logic.
- `lastAttemptAt`: timestamp of the last destination run.
- `error`: sanitized failure message.
- `externalId`: downstream ID when available, currently most useful for Airtable.

## API Summary

Dashboard endpoints require `DASHBOARD_API_KEY` when it is configured:

- `GET /health`: unauthenticated health check.
- `POST /webhooks/tally`: real Tally webhook, protected by Tally HMAC signature when `TALLY_SIGNING_SECRET` is set.
- `POST /webhooks/simulate`: dashboard simulator, protected by dashboard auth.
- `GET /events`: paginated newest-first submission list.
- `GET /events/stats`: aggregate counts for the status sidebar.
- `GET /events/:id`: single submission.
- `POST /events/:id/retry`: retry only failed destinations.

The canonical endpoint reference is `docs/API_REFERENCE.md`.

Note: `verifyTallySignature.js` expects the `Tally-Signature` header to be a base64 HMAC-SHA256 digest. If external docs or Postman examples mention hex, trust the code and `docs/TALLY_WEBHOOK.md`.

## Environment Variables

Server:

- `PORT`: defaults to `5000`.
- `NODE_ENV`: `development` or `production`.
- `CLIENT_URL`: CORS origin, defaults to `http://localhost:5173`.
- `MONGODB_URI`: required in all environments.
- `DASHBOARD_API_KEY`: required in production; protects dashboard APIs.
- `TALLY_SIGNING_SECRET`: required in production; validates real webhook requests.
- `AIRTABLE_API_KEY`: Airtable personal access token.
- `AIRTABLE_BASE_ID`: Airtable base ID.
- `AIRTABLE_TABLE_NAME`: table name, defaults to `Submissions` in code.
- `DISCORD_WEBHOOK_URL`: Discord incoming webhook URL.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: single-line service account JSON.
- `GOOGLE_SHEET_ID`: target spreadsheet ID.

Client:

- `VITE_API_URL`: backend base URL, defaults to `http://localhost:5000`.
- `VITE_DASHBOARD_API_KEY`: must match server `DASHBOARD_API_KEY` when auth is enabled.

In development, missing integration secrets are logged as warnings except `MONGODB_URI`, which is always required. In production, `config/env.js` requires all production variables.

## Local Runbook

Install dependencies:

```bash
cd server
npm install
cd ../client
npm install
```

Create env files:

```bash
copy .env.example server\.env
copy client\.env.example client\.env
```

Start MongoDB locally or point `MONGODB_URI` at Atlas.

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

Open `http://localhost:5173` and use the simulator first. A healthy local demo should create a card, then update destination pills after fanout completes.

## Testing

Backend tests use Node's built-in test runner:

```bash
cd server
npm test
```

Current tests cover:

- Tally payload parsing and validation.
- Retry helper success/failure behavior.

There are no current automated tests for Express routes, Mongo persistence, or third-party service adapters. For regression safety, add route/controller tests around auth, deduplication, retry, and webhook signature verification before making large backend changes.

Frontend has lint and build scripts:

```bash
cd client
npm run lint
npm run build
```

There is no current frontend test suite.

## Operational Notes

- Real Tally requests must hit `/webhooks/tally` with the raw body intact. Do not move global `express.json()` ahead of that route unless the signature middleware is redesigned.
- Startup recovery in `recoverProcessingSubmissions()` replays submissions left in `processing`, useful after a server crash during fanout.
- Fanout timeout is 15 seconds per destination. Each destination retries up to 3 times with exponential backoff starting at 500 ms.
- Retrying from the dashboard only re-runs destinations currently marked `failed`.
- Airtable and Sheets include duplicate checks keyed by `Submission ID`; Discord does not have a practical idempotency check and may post again if retried after an ambiguous failure.
- Destination error strings are capped and sanitized to avoid leaking Discord webhook URLs and Airtable tokens into Mongo/dashboard output.
- Dashboard field masking is display-only. Raw values remain in MongoDB.
- Google Sheets integration assumes the worksheet tab is named `Sheet1`.
- Airtable field names must exactly match the mapped field names in `airtableService.js`.

## Security Notes

- Dashboard auth is disabled in non-production if `DASHBOARD_API_KEY` is missing, but production fails closed.
- Tally signature verification is skipped in non-production if `TALLY_SIGNING_SECRET` is missing, but production fails closed.
- String comparisons for dashboard API keys and webhook signatures use timing-safe comparisons.
- Rate limits are defined separately for dashboard reads, dashboard writes, and Tally webhooks.
- Never commit real `.env` files, Google service account JSON, Airtable tokens, or Discord webhook URLs.

## Common Troubleshooting

- Dashboard cannot load: confirm backend is running, `VITE_API_URL` points to it, and dashboard keys match.
- `401 Unauthorized` on dashboard requests: `VITE_DASHBOARD_API_KEY` does not match `DASHBOARD_API_KEY`.
- `401` on Tally webhook: signing secret mismatch or missing `Tally-Signature` header.
- Submission stuck in `processing`: server likely crashed mid-fanout or a save failed; restart should trigger processing recovery.
- Airtable failure: verify token scopes, base ID, table name, and exact field names.
- Discord failure: webhook may have been deleted or regenerated.
- Sheets `PERMISSION_DENIED`: share the sheet with the service account email.
- Sheets range error: rename the worksheet tab to `Sheet1` or update `sheetsService.js`.

## Good Next Improvements

- Add integration-style tests for `/webhooks/tally`, `/webhooks/simulate`, `/events/:id/retry`, and auth failures.
- Add unit tests for `verifyTallySignature.js`, `requireDashboardAuth.js`, and `fanoutService.js` using mocked destination services.
- Reconcile `docs/API_REFERENCE.md` signature wording so it consistently says base64.
- Consider configurable Sheets tab/range instead of hard-coding `Sheet1!A:F`.
- Consider moving destination field mappings into config if this will support many forms with different labels.
- Add frontend empty/error states that distinguish auth failure from server-down failure.
- Add a lightweight deployment guide once the intended hosting target is chosen.
