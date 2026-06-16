# API Reference

Base URL (local): `http://localhost:5000`

## Webhooks

### `POST /webhooks/tally`

Receives a real Tally form submission. Requires the raw JSON body and a valid `tally-signature` header (see [TALLY_WEBHOOK.md](./TALLY_WEBHOOK.md)).

**Headers**
```
Content-Type: application/json
tally-signature: <hex HMAC-SHA256>
```

**Response — `202 Accepted`**
```json
{ "message": "Accepted", "id": "664f1a2b3c4d5e6f7a8b9c0d" }
```

The fanout to Airtable/Discord/Sheets runs asynchronously after this response is sent — poll `GET /events/:id` or watch the dashboard to see per-destination results land.

**Response — `200 OK`** (duplicate submission, already processed)
```json
{ "message": "Already processed", "id": "664f1a2b3c4d5e6f7a8b9c0d" }
```

**Response — `401 Unauthorized`** — missing or invalid signature

---

### `POST /webhooks/simulate`

Fires a synthetic submission through the exact same fanout pipeline, bypassing signature verification. Used by the dashboard's "Simulate" panel.

**Body** (all fields optional — defaults are used if omitted)
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Corp",
  "message": "Interested in a demo."
}
```

**Response — `202 Accepted`**
```json
{ "message": "Simulation started", "id": "664f1a2b3c4d5e6f7a8b9c0d" }
```

---

## Events

### `GET /events`

Paginated list of submissions, newest first.

**Query params**
| Param | Default | Max |
|---|---|---|
| `page` | 1 | — |
| `limit` | 20 | 100 |

**Response**
```json
{
  "submissions": [ /* Submission documents, see schema below */ ],
  "total": 42,
  "page": 1,
  "pages": 3
}
```

---

### `GET /events/:id`

Single submission detail.

**Response — `200 OK`** — a Submission document
**Response — `404 Not Found`**

---

### `POST /events/:id/retry`

Re-runs only the destinations currently marked `failed` on this submission. Does nothing to destinations already `success`.

**Response — `200 OK`** — updated Submission document
**Response — `400 Bad Request`** — no failed destinations to retry
```json
{ "error": "No failed destinations to retry" }
```
**Response — `404 Not Found`**

---

### `GET /events/stats`

Aggregate counts for the Integration Health panel.

**Response**
```json
{
  "total": 42,
  "success": 35,
  "partial": 5,
  "failed": 2,
  "processing": 0,
  "destinationStats": [
    { "_id": { "destination": "airtable", "status": "success" }, "count": 38 },
    { "_id": { "destination": "discord", "status": "failed" }, "count": 4 }
  ]
}
```

---

## Submission document schema

```ts
{
  _id: string,
  tallyFormId: string,
  tallySubmissionId: string,   // unique — used for dedup on re-delivery
  respondentId: string,
  fields: Record<string, string>,   // flattened Tally field labels → values
  overallStatus: "processing" | "success" | "partial_failure" | "failed",
  destinations: [
    {
      destination: "airtable" | "discord" | "sheets",
      status: "pending" | "success" | "failed",
      attempts: number,        // retry attempts consumed (max 3)
      lastAttemptAt: string,   // ISO timestamp
      error: string | null,
      externalId: string | null  // e.g. Airtable record ID
    }
  ],
  simulatedAt: string | null,  // set only for /webhooks/simulate events
  createdAt: string,
  updatedAt: string
}
```

## Other

### `GET /health`

```json
{ "status": "ok", "ts": "2026-06-16T12:00:00.000Z" }
```
