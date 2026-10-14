# CLAUDE.md

Starter app for an AI Build Lab session: **Stroopwafel Ventures**, a fictional Amsterdam VC fund.
Sub-teams build matching and warm-introduction features on top of it. See README.md for setup.

## Hard rules

1. **All data is fictional.** No real companies, funds or people in code, fixtures, prompts, docs or tests.
   Use `.example` domains. Names must be invented.
2. **Never commit participant data.** Real participants live only in `seed/participants.local.json` (git-ignored).
   Fixtures reference team members by key only (`p01`…, `i01`…); note bodies use `{{user:p04}}` tokens.
   Run `npm run check:privacy` before committing (a pre-commit hook does this too).
3. **Never commit real personal data**, including output from Perplexity, Reverse Contact, Harmonic or a LinkedIn export.
4. Never expose server secrets: only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be public.

## Next.js 16 (read before writing code)

This is newer than most training data. Version-matched docs: `node_modules/next/dist/docs/`.
- `proxy.ts` replaces `middleware.ts`.
- `params`, `searchParams`, `cookies()`, `headers()` are async: `const { id } = await params`.
- Use the global `PageProps<"/route/[id]">`, `LayoutProps<"/">`, `RouteContext<"/api/x/[y]">` helpers (run `npx next typegen` if missing).
- `cacheComponents` is off: pages render dynamically per request.

## Conventions

- **Server components by default.** Add `"use client"` only for interactivity (forms, pickers).
- **Supabase:** `createClient()` from `lib/supabase/server.ts` in server code (acts as the user; RLS applies).
  `createAdminClient()` from `lib/supabase/admin.ts` only after `requireAdmin()`. Scripts use `lib/supabase/service.ts`.
- **Auth:** `requireUser()` / `requireAdmin()` / `getCurrentUser()` in `lib/auth.ts`. The current team member is
  `me.profile` (resolved via `user_logins`, so any linked email works).
- **Prompts** live in `lib/prompts/` (Zod schema + system prompt + builder). **Integrations** live in `lib/integrations/`
  (one typed function each, server-only, mock mode without a key).
- **AI routes:** start with `guardApi(bucket)` (auth + rate limit), set `export const maxDuration`, stream long output
  with `claudeStream()`. Template: `app/api/ai/example/route.ts`.
- **List pages:** queries live in `lib/queries.ts` and are shared with `/api/export/[entity]` (CSV). Filters are GET params.
- **UI:** `components/ui.tsx` (PageHeader, Card, Table, ListToolbar, Strength…), brand art in `components/brand/`.
  Colours are Tailwind tokens: `cream`, `ink`, `muted`, `waffle`, `caramel`, `canal`, `tulip`, `surface`, `line`.
- Dutch flavour in copy is occasional; data pages stay clean and serious.

## Schema summary

`supabase/migrations/0001_init.sql`. Row types in `lib/types.ts`; fixture shapes in `lib/fixtures.ts`.

- `users` (key `p01`… participants / `i01`–`i05` investment team, role, source `seed|admin`)
- `user_logins` (email PK → user_id, auth_user_id): many emails per person
- `companies` (kind `portfolio|corporate|investor|startup|other`, stage, invested_on)
- `company_deal_team` (company, user, role `lead|board|support`)
- `jobs` (portfolio companies; department, seniority, remote_policy, employment_type, status)
- `contacts` (LinkedIn-shaped; contact_type; expertise_tags; `search` tsvector)
- `contact_employment` (LinkedIn Positions-shaped; `finished_on` null = current)
- `user_contacts` (user, contact, strength 1–5)
- `meeting_notes` (+ `meeting_note_users`, `meeting_note_contacts`; markdown body; `search` tsvector)
- `embeddings` (pgvector 1024, optional), `rate_limits`

RLS: signed-in users read everything and can insert/update contacts, employment, relationships and notes.
People and logins change only through `addParticipant()` with the service role.

## Commands

`npm run dev` · `npm run typecheck` · `npm run lint` · `npm run seed` · `npm run generate` ·
`npm run validate:fixtures` · `npm run add-user -- …` · `npm run embed` · `npm run check:privacy`
