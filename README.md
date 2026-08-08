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
- Netlify Functions
- `pdf-parse` for text-layer PDF extraction
- Google AI Studio (Gemini `gemini-2.5-flash`) via `@google/generative-ai`

Every service runs on a permanent free tier. There are no paid APIs.

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

## Project status

Built incrementally. See the build order in the project brief. Step 1 (scaffold,
Tailwind, Supabase client, auth, schema + RLS) is complete.
