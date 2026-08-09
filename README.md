# Claritas

A free web app that audits medical bills. Upload a PDF or photo of an itemized
bill and Claritas extracts every charge, explains it in plain English, flags
internal errors and inconsistencies, tells you what legal rights and programs
may apply, and generates a letter you can send to the provider.

**Claritas is not legal, medical, or insurance advice.**

## Design note: no pricing data, by design

Claritas deliberately owns **no** medical code database, no CMS fee schedule,
and no price benchmark dataset. It never states, estimates, or implies a "fair"
price or Medicare rate for any charge. It only reads the codes and amounts off
the bill you upload.

The value comes from two things the app *can* do honestly without pricing data:

1. **Internal error detection** — deterministic checks on the bill's own
   contents (does the math add up, are there duplicates, do units make sense).
2. **Rights matching** — a hand-written, plain-language knowledge base of
   patient rights and programs, matched to the specifics of your bill.

If you want to know what a code *should* cost, the app links you to the public
[CMS Physician Fee Schedule Look-Up Tool](https://www.cms.gov/medicare/physician-fee-schedule/search).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth) — free tier
- Netlify (the analysis pipeline is a Next.js Route Handler that
  `@netlify/plugin-nextjs` deploys as a serverless function, so the API keys
  never reach the browser)
- `pdf-parse` for text-layer PDF extraction
- Google AI Studio (Gemini) via `@google/generative-ai`

Every service runs on a permanent free tier. There are no paid APIs.

### A note on the Gemini model

The project targets `gemini-2.5-flash`, but Google now blocks the bare
`gemini-2.5-flash` alias for newly created API keys. The code therefore uses
`gemini-flash-latest` — Google's alias for the current stable free-tier Flash
model, which new keys can use. It is a single constant in
[`lib/gemini.ts`](lib/gemini.ts) if you need to change it.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project at [supabase.com](https://supabase.com) (free
   tier). In the Supabase dashboard, open **SQL Editor** and run the contents
   of [`supabase/schema.sql`](supabase/schema.sql). This creates the tables and
   enables Row Level Security so each user can only read and write their own
   rows.

3. Copy `.env.example` to `.env.local` and fill in the values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=       # Supabase -> Project Settings -> API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase -> Project Settings -> API (anon/public key)
   SUPABASE_SERVICE_ROLE_KEY=      # Supabase -> Project Settings -> API (service_role key) — server only
   GEMINI_API_KEY=                 # Google AI Studio -> Get API key — server only
   ```

   `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are **server-only**. Never
   prefix them with `NEXT_PUBLIC_`. `.env.local` is gitignored and must never be
   committed.

4. Run the dev server:

   ```bash
   npm run dev
   ```

## Deploy to Netlify

1. Push this repository to GitHub.
2. In Netlify, **Add new site -> Import an existing project** and pick the repo.
   The build settings are read from [`netlify.toml`](netlify.toml).
3. Under **Site settings -> Environment variables**, add all four variables from
   `.env.example` with your real values. Local and deployed environments do not
   share config, so this is required even though you set them in `.env.local`.
4. Deploy.

## How the pipeline fits together

1. `/analyze` (client) sends the uploaded file or pasted text to
   `POST /api/analyze`.
2. The route extracts text (`pdf-parse` for text-layer PDFs; Gemini inline
   transcription for scans and photos), then runs [`lib/scrub.ts`](lib/scrub.ts)
   on **all** text before anything is stored, logged, or sent onward.
3. Gemini extracts structured line items (JSON schema); the result is validated
   and normalized in [`lib/types.ts`](lib/types.ts).
4. [`lib/flags.ts`](lib/flags.ts) runs deterministic checks on the bill's own
   contents (math, duplicates, unit anomalies, unbundling, vague lines).
5. [`lib/rights.ts`](lib/rights.ts) matches the static rights knowledge base to
   the bill.
6. For signed-in users the bill, charges, flags, and rights are persisted under
   Row Level Security; signed-out users get the analysis held in the page.
7. [`lib/letter.ts`](lib/letter.ts) builds a dispute letter deterministically
   from the stored data — no model involved.

## Testing

```bash
npm test        # Jest unit tests (scrub, flags, rights, letter, pdf wrapper)
npm run lint    # ESLint
npx tsc --noEmit # type check
```

The scrubber, flag engine, rights matcher, and letter builder are covered by
unit tests over synthetic fixtures. No real bill data is committed anywhere.
