# Tally Webhook Setup

## 1. Create a form

Go to [tally.so](https://tally.so) and create a form with at least these fields (labels matter — they become the dashboard's field names):

- `Name` (short text)
- `Email` (email)
- `Company` (short text)
- `Message` (long text)

## 2. Expose your local server with ngrok

Tally needs a public URL to send webhooks to. While your backend is running on port 5000:

```bash
ngrok http 5000
```

Copy the `https://<random>.ngrok-free.app` URL it gives you.

## 3. Add the webhook in Tally

In your form: **Integrations → Webhooks → Add webhook**

- URL: `https://<your-ngrok-url>/webhooks/tally`
- Method: `POST`
- Payload format: leave as default (JSON)

## 4. Get the signing secret

Tally generates a signing secret per webhook so you can verify requests actually came from Tally (not a forged request). Click **+ Add a signing secret** on the "Add a webhook endpoint" screen — Tally generates it for you, shown once.

Copy it into `server/.env`:

```
TALLY_SIGNING_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> If you leave this blank, the server still works but logs a warning and skips verification — fine for local demos, not for anything public-facing.

## 5. How verification works

Tally signs the raw JSON body with HMAC-SHA256 using the signing secret, and sends the **base64** digest in the `Tally-Signature` header. [verifyTallySignature.js](../server/middleware/verifyTallySignature.js) recomputes the same HMAC over the raw request body and compares it with `crypto.timingSafeEqual` (constant-time, so the comparison itself can't leak timing information to an attacker).

The webhook route uses `express.raw()` instead of `express.json()` specifically so the *exact* bytes Tally signed are available for the HMAC — if Express re-serialized the JSON first, whitespace differences would break the signature check.

## 6. Submit a real test

Fill out your live Tally form. Within a couple seconds the submission should appear in the dashboard feed, fanning out to all three destinations.

## 7. Payload shape reference

```json
{
  "eventId": "evt_abc123",
  "createdAt": "2026-06-15T10:00:00.000Z",
  "data": {
    "responseId": "resp_abc123",
    "submissionId": "sub_abc123",
    "respondentId": "respondent_abc123",
    "formId": "form_xyz",
    "formName": "Lead Capture",
    "fields": [
      { "key": "question_1", "label": "Name", "type": "INPUT_TEXT", "value": "Jane Doe" },
      { "key": "question_2", "label": "Email", "type": "INPUT_EMAIL", "value": "jane@example.com" }
    ]
  }
}
```

[tallyService.js](../server/services/tallyService.js) flattens the `fields` array into a `{ label: value }` map, which is what every downstream service (Airtable, Discord, Sheets) consumes.
