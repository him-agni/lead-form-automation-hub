# Airtable Setup

## 1. Create a base and table

In Airtable, create a new base (or use an existing one) with a table containing these exact columns — names must match what [airtableService.js](../server/services/airtableService.js) sends, or the create call will silently drop unmatched fields:

| Field name | Type |
|---|---|
| Submission ID | Single line text |
| Name | Single line text |
| Email | Email |
| Company | Single line text |
| Message | Long text |
| Submitted At | Single line text (ISO string — see note below) |
| Source | Single line text |

> Airtable's native "Date" field type expects a specific format and can reject ISO strings with time components. Using "Single line text" for `Submitted At` avoids that friction — you can always convert later in Airtable's UI.

## 2. Generate a personal access token

Airtable retired API keys in favor of personal access tokens.

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Name it (e.g. `form-automation-hub`)
4. Scopes: add `data.records:write` and `data.records:read`
5. Access: select the specific base you created above
6. Copy the token (starts with `pat...`)

```
AIRTABLE_API_KEY=patXXXXXXXXXXXXXX
```

## 3. Find your Base ID

Open your base in the browser. The URL looks like:

```
https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
```

The `app...` segment is your Base ID:

```
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

## 4. Set the table name

```
AIRTABLE_TABLE_NAME=Submissions
```

This must match the table name exactly (case-sensitive). If you rename the table in Airtable later, update this too.

## 5. Verify

Run the **Simulate** flow from the dashboard. A new row should appear in your Airtable table within a few seconds, and the submission card's Airtable pill should turn green.

## Common errors

| Error | Cause |
|---|---|
| `NOT_AUTHORIZED` | Token doesn't have access to this base — re-check scope in step 2 |
| `INVALID_REQUEST_UNKNOWN` (422) | A field name in the request doesn't exist in your table — check spelling/case |
| `NOT_FOUND` | Wrong Base ID or table name |
