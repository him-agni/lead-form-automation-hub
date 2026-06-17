# Setup Guide

End-to-end steps to get the Lead & Form Automation Hub running locally, from zero to a live submission flowing through Airtable, Discord, and Google Sheets.

## 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`) or a MongoDB Atlas connection string
- A [ngrok](https://ngrok.com/) account (free tier) for exposing your local server to Tally's webhook

## 2. Clone & install

```bash
cd server && npm install
cd ../client && npm install
```

## 3. Configure environment variables

Copy the template and fill in real values:

```bash
cp .env.example server/.env
```

Set `DASHBOARD_API_KEY` in `server/.env` to a long random value. Then create `client/.env` from `client/.env.example` and set `VITE_DASHBOARD_API_KEY` to the same value so the dashboard can call protected endpoints.

Each integration has its own setup doc — work through them in this order, since later steps depend on earlier ones:

1. [AIRTABLE_SETUP.md](./AIRTABLE_SETUP.md) — create the base/table, get your API key
2. Discord — Server Settings → Integrations → Webhooks → New Webhook → copy URL into `DISCORD_WEBHOOK_URL`
3. [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) — service account + Sheets API
4. [TALLY_WEBHOOK.md](./TALLY_WEBHOOK.md) — form + webhook + signing secret

## 4. Start MongoDB

If running locally:

```bash
mongod
```

## 5. Start the backend

```bash
cd server
npm run dev
```

You should see:

```
[server] MongoDB connected
[server] Listening on http://localhost:5000
```

## 6. Start the frontend

```bash
cd client
npm run dev
```

Open `http://localhost:5173` — you'll see the dashboard with zero submissions.

## 7. Test without Tally (Simulate button)

Before wiring up the real Tally webhook, click **Fire Test Submission** in the dashboard sidebar. This POSTs to `/webhooks/simulate`, which skips signature verification and runs the exact same fanout logic. Within a few seconds you should see:

- A new card in the Live Submission Feed
- Status pills for Airtable / Discord / Sheets turning green (or red, if a key is missing/misconfigured)
- The Integration Health panel updating

If a destination fails, click **Retry Failed Destinations** on the card — this re-runs only the failed integrations, not the whole submission.

## 8. Wire up the real Tally webhook

Once the simulate flow works end-to-end, follow [TALLY_WEBHOOK.md](./TALLY_WEBHOOK.md) to point a real Tally form at your ngrok URL.

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Card stuck on "Processing" forever | Server crashed mid-fanout — check server logs |
| All destinations show "Failed" immediately | Missing/incorrect env var — check spelling against `.env.example` |
| Discord shows failed, others succeed | Webhook URL revoked/regenerated in Discord — get a fresh URL |
| 401 on real Tally submissions | Signing secret mismatch — see [TALLY_WEBHOOK.md](./TALLY_WEBHOOK.md) |
| Sheets fails with `PERMISSION_DENIED` | Service account email not shared on the sheet — see [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) |
