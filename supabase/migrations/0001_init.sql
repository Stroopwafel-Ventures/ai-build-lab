-- =====================================================================
-- Stroopwafel Ventures: initial schema
-- All data in this database is fictional except the participant logins.
-- Run with `supabase db push`, or paste into the Supabase SQL editor.
-- =====================================================================

create extension if not exists vector;   -- pgvector, for semantic matching later
create extension if not exists pg_trgm;  -- fuzzy name search

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type user_role as enum ('investment','platform','talent','community','partnerships','operations','admin');
create type company_kind as enum ('portfolio','corporate','investor','startup','other');
create type company_stage as enum ('pre-seed','seed','series-a','series-b','series-c+');
create type deal_team_role as enum ('lead','board','support');
create type contact_type as enum ('portfolio_exec','investor','candidate','expert','corporate','operator','other');
create type meeting_type as enum ('portfolio_checkin','founder_catchup','candidate_chat','investor_meeting','expert_call','corporate_meeting','event_conversation');

-- ---------------------------------------------------------------------
-- People on the Stroopwafel Ventures team
-- ---------------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                 -- p01… participants, i01–i05 investment team
  full_name text not null,
  title text,
  role user_role not null default 'platform',
  is_participant boolean not null default true,
  avatar_initials text,
  source text not null default 'seed' check (source in ('seed','admin')),
  created_at timestamptz not null default now()
);

-- Login identity. One user can sign in from several emails.
create table user_logins (
  email text primary key check (email = lower(email)),
  user_id uuid not null references users(id) on delete cascade,
  auth_user_id uuid unique,                 -- auth.users.id for this email
  created_at timestamptz not null default now()
);
create index on user_logins(user_id);

-- ---------------------------------------------------------------------
-- Organizations: portfolio companies and everything else
-- ---------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind company_kind not null,
  industry text,
  hq_location text,
  website text,
  description text,
  employee_count_range text,
  linkedin_url text,
  stage company_stage,                      -- portfolio only
  invested_on date,                         -- portfolio only
  created_at timestamptz not null default now()
);
create index on companies(kind);
create index companies_name_trgm on companies using gin (name gin_trgm_ops);

create table company_deal_team (
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role deal_team_role not null,
  primary key (company_id, user_id)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  department text check (department in ('engineering','sales','marketing','product','ops','finance','people','exec')),
  seniority text check (seniority in ('junior','mid','senior','lead','director','vp','c-level')),
  location text,
  remote_policy text check (remote_policy in ('onsite','hybrid','remote')),
  employment_type text check (employment_type in ('full-time','part-time','contract','fractional')),
  description text,
  status text not null default 'open' check (status in ('open','paused','filled')),
  posted_on date,
  created_at timestamptz not null default now()
);
create index on jobs(company_id);
create index on jobs(status);

-- ---------------------------------------------------------------------
-- Contacts (field names follow LinkedIn's Connections/Profile exports)
-- ---------------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  linkedin_url text,
  headline text,
  summary text,
  location text,
  current_company_id uuid references companies(id) on delete set null,
  current_company_name text,
  current_title text,
  contact_type contact_type not null default 'other',
  expertise_tags text[] not null default '{}',
  source text not null default 'seed' check (source in ('seed','linkedin_import','manual')),
  created_at timestamptz not null default now(),
  -- Full-text search over the useful text columns.
  search tsvector generated always as (
    to_tsvector('english',
      coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' ||
      coalesce(headline,'') || ' ' || coalesce(summary,'') || ' ' ||
      coalesce(current_company_name,'') || ' ' || coalesce(current_title,''))
  ) stored
);
create index on contacts(current_company_id);
create index on contacts(contact_type);
create index contacts_search_idx on contacts using gin (search);
create index contacts_tags_idx on contacts using gin (expertise_tags);

-- LinkedIn "Positions"-shaped employment history.
create table contact_employment (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,  -- set when the company exists
  company_name text not null,                                    -- always populated
  title text,
  description text,
  location text,
  started_on date,
  finished_on date,                                              -- null = current role
  created_at timestamptz not null default now()
);
create index on contact_employment(contact_id);
create index on contact_employment(company_id);

-- Who on the team knows whom, and how well (1 = barely, 5 = very close).
create table user_contacts (
  user_id uuid not null references users(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  strength smallint not null check (strength between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, contact_id)
);
create index on user_contacts(contact_id);

-- ---------------------------------------------------------------------
-- Meeting notes (Granola-style markdown)
-- ---------------------------------------------------------------------
create table meeting_notes (
  id uuid primary key default gen_random_uuid(),
  met_on date not null,
  title text not null,
  meeting_type meeting_type not null,
  company_id uuid references companies(id) on delete set null,
  summary text,
  body text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body,''))
  ) stored
);
create index on meeting_notes(company_id);
create index on meeting_notes(met_on desc);
create index meeting_notes_search_idx on meeting_notes using gin (search);

create table meeting_note_users (
  note_id uuid not null references meeting_notes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (note_id, user_id)
);
create table meeting_note_contacts (
  note_id uuid not null references meeting_notes(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  primary key (note_id, contact_id)
);
create index on meeting_note_contacts(contact_id);

-- ---------------------------------------------------------------------
-- Embeddings (optional; filled by `npm run embed` with a Voyage key)
-- voyage-3.5 returns 1024-dimensional vectors.
-- ---------------------------------------------------------------------
create table embeddings (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('contact','company','job','meeting_note')),
  entity_id uuid not null,
  content text not null,
  vector vector(1024),
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

-- ---------------------------------------------------------------------
-- Simple per-user rate limiting for AI / integration routes
-- ---------------------------------------------------------------------
create table rate_limits (
  user_id uuid not null references users(id) on delete cascade,
  bucket text not null,                     -- e.g. 'ai:example'
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, bucket, window_start)
);

-- Atomically bump the signed-in user's counter for a bucket and return the
-- new count. Called from lib/rateLimit.ts via supabase.rpc().
create or replace function bump_rate_limit(p_bucket text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := current_app_user_id();
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  insert into rate_limits (user_id, bucket, window_start, count)
  values (uid, p_bucket, w, 1)
  on conflict (user_id, bucket, window_start) do update set count = rate_limits.count + 1
  returning count into c;
  return c;
end;
$$;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- The users.id of whoever is signed in (via any of their linked emails).
create or replace function current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from user_logins where auth_user_id = auth.uid() limit 1
$$;

-- ---------------------------------------------------------------------
-- Row level security
-- Any signed-in team member can read everything, and can write the
-- "working" tables. People and logins are managed by admins via the
-- service role (see lib/participants.ts).
-- ---------------------------------------------------------------------
alter table users enable row level security;
alter table user_logins enable row level security;
alter table companies enable row level security;
alter table company_deal_team enable row level security;
alter table jobs enable row level security;
alter table contacts enable row level security;
alter table contact_employment enable row level security;
alter table user_contacts enable row level security;
alter table meeting_notes enable row level security;
alter table meeting_note_users enable row level security;
alter table meeting_note_contacts enable row level security;
alter table embeddings enable row level security;
alter table rate_limits enable row level security;

do $$
declare t text;
begin
  -- read access for every signed-in user
  foreach t in array array['users','companies','company_deal_team','jobs','contacts',
                           'contact_employment','user_contacts','meeting_notes','meeting_note_users',
                           'meeting_note_contacts','embeddings']
  loop
    execute format('create policy "authenticated can read" on %I for select to authenticated using (true)', t);
  end loop;

  -- insert/update for the working tables
  foreach t in array array['contacts','contact_employment','user_contacts','meeting_notes',
                           'meeting_note_users','meeting_note_contacts']
  loop
    execute format('create policy "authenticated can insert" on %I for insert to authenticated with check (true)', t);
    execute format('create policy "authenticated can update" on %I for update to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- user_logins: you can see your own emails only (admins use the service role).
create policy "own logins" on user_logins for select to authenticated
  using (auth_user_id = auth.uid() or user_id = current_app_user_id());

-- rate_limits: users can see their own counters; writes go through bump_rate_limit().
create policy "own rate limits" on rate_limits for select to authenticated
  using (user_id = current_app_user_id());

-- ---------------------------------------------------------------------
-- reset_app_data(): wipes the app data tables, but NEVER users or
-- user_logins. Used by `npm run seed` and the admin "Re-seed" button.
-- Only the service role may call it.
-- ---------------------------------------------------------------------
create or replace function reset_app_data()
returns void
language sql
security definer
set search_path = public
as $$
  truncate table meeting_note_contacts, meeting_note_users, meeting_notes,
                 user_contacts, contact_employment, contacts, jobs,
                 company_deal_team, companies, embeddings, rate_limits
  restart identity;
$$;
revoke execute on function reset_app_data() from public, anon, authenticated;
