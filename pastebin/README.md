# stub — a small Pastebin

Paste text, get a shareable link, optionally set it to expire by time and/or
by number of views.

## Stack

- **Next.js 15 (App Router)** — single deployable for both the UI and the API
- **Postgres** (Neon) via `@neondatabase/serverless` — HTTP-based driver, works
  well in serverless/edge environments (no persistent TCP connection pool to manage)
- **Tailwind CSS** for styling, no component library

## How it works

### Data model (`schema.sql`)

```sql
pastes (
  id          TEXT PRIMARY KEY,   -- 10-char random slug
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NULL,   -- NULL = no time-based expiry
  max_views   INTEGER NULL,       -- NULL = unlimited views
  view_count  INTEGER DEFAULT 0,
  burned      BOOLEAN DEFAULT false
)
```

### Expiry logic — the interesting part

A paste can expire two ways: **time-based** (`expires_at`) and
**view-based** (`max_views`). The tricky bit is view-based expiry under
concurrent requests: if two people open a "burn after 1 view" link at the
same instant, only one of them should actually see the content.

This is handled with a single atomic `UPDATE ... WHERE ... RETURNING`
(see `getAndRegisterView` in `src/lib/pastes.ts`):

```sql
UPDATE pastes
SET
  view_count = view_count + 1,
  burned = burned OR (max_views IS NOT NULL AND view_count + 1 >= max_views)
WHERE id = $1
  AND burned = false
  AND (expires_at IS NULL OR expires_at > now())
RETURNING *;
```

Postgres serializes row-level updates, so under a race, exactly one request's
`UPDATE` commits first, flips `burned` to `true` (when the view limit is hit),
and returns the row. The second request's `WHERE burned = false` no longer
matches, so it gets zero rows back and is told the paste is gone. This avoids
a read-then-write race that a naive "SELECT count, check in app code, then
UPDATE" approach would have.

If the `UPDATE` matches nothing, a follow-up `SELECT` distinguishes "never
existed" (404) from "existed but expired/burned" (410 Gone).

### API

- `POST /api/pastes` — `{ content, expiresInSeconds?, maxViews? }` →
  `{ id, url, rawUrl, createdAt, expiresAt, maxViews }`
- `GET /api/pastes/:id` — returns paste content and **registers a view**.
  `404` if the id doesn't exist, `410` if expired or view-limit reached.
- `GET /p/:id` — the human-facing viewer page (client component that calls
  the API above once on mount).

Content is capped at 500KB per paste to keep things reasonable on a free-tier
database.

### Frontend

- `/` — paste form with expiry/view-limit dropdowns, shows the resulting
  link with a copy button once submitted.
- `/p/[id]` — fetches and displays the paste, or a clear "expired" / "not
  found" state. Uses a `useRef` guard against React StrictMode's dev-time
  double-invoke of effects, so a single page load only ever registers one
  view against the API.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Neon DATABASE_URL
```

Run `schema.sql` once against your database (e.g. via the Neon SQL editor,
or `psql "$DATABASE_URL" -f schema.sql`).

```bash
npm run dev
```

## Deploying (Vercel + Neon)

1. Create a free Neon project at neon.tech, copy the connection string.
2. Run `schema.sql` against it (Neon's web SQL editor works fine).
3. Push this repo to GitHub, import it into Vercel.
4. In Vercel project settings → Environment Variables, add `DATABASE_URL`
   with the Neon connection string.
5. Deploy. No other configuration needed — Next.js API routes deploy as
   serverless functions automatically.

## Design decisions / trade-offs

- **No auth, no ownership** — matches the brief ("users can quickly store and
  share"). Links are unguessable (10-char random slug from a 58-character
  alphabet, ~59 bits of entropy) but not access-controlled beyond that.
- **View counting happens on the API fetch, not on page render** — the
  `/p/[id]` page is a thin client wrapper; the actual "did this count as a
  view" decision lives entirely in the database transaction, which is the
  only place that can safely arbitrate concurrent access.
- **`@neondatabase/serverless`'s HTTP driver** rather than a pooled `pg`
  client — avoids connection-pool exhaustion issues that are common when
  deploying traditional Postgres clients to serverless functions.
