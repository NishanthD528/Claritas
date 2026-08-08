-- Claritas schema + Row Level Security.
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Safe to re-run: it drops policies before recreating them.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  filename text,
  provider_name text,
  facility_type text,              -- hospital | clinic | lab | imaging | other
  service_date_start date,
  service_date_end date,
  stated_total numeric,            -- the total printed on the bill
  computed_total numeric,          -- sum of line items
  flag_count int default 0,
  status text default 'analyzed',  -- analyzed | disputing | resolved
  scrubbed_text text,              -- scrubbed text only, never raw
  created_at timestamptz default now()
);

create table if not exists charges (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills on delete cascade not null,
  line_number int,
  code text,                       -- as printed on the bill, may be null
  code_type text,                  -- cpt | hcpcs | revenue | none
  description_raw text,            -- as printed on the bill
  description_plain text,          -- model-generated plain English
  service_date date,
  units int default 1,
  unit_price numeric,
  amount_charged numeric
);

create table if not exists flags (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills on delete cascade not null,
  charge_id uuid references charges on delete cascade,
  flag_type text,
  severity text,                   -- low | medium | high
  explanation text,
  suggested_question text          -- what to ask billing, phrased as a question
);

create table if not exists rights (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills on delete cascade not null,
  right_key text,                  -- maps to a static entry in lib/rights.ts
  relevance text                   -- why this applies to this specific bill
);

create table if not exists dispute_notes (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills on delete cascade not null,
  note text,
  created_at timestamptz default now()
);

-- Helpful indexes for the ownership joins used by RLS on child tables.
create index if not exists idx_bills_user_id on bills (user_id);
create index if not exists idx_charges_bill_id on charges (bill_id);
create index if not exists idx_flags_bill_id on flags (bill_id);
create index if not exists idx_rights_bill_id on rights (bill_id);
create index if not exists idx_dispute_notes_bill_id on dispute_notes (bill_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- A user may only read/write rows tied to their own user_id. Child tables
-- inherit ownership through their parent bill.
-- ---------------------------------------------------------------------------

alter table bills enable row level security;
alter table charges enable row level security;
alter table flags enable row level security;
alter table rights enable row level security;
alter table dispute_notes enable row level security;

-- bills: owned directly by user_id
drop policy if exists "bills_select_own" on bills;
create policy "bills_select_own" on bills
  for select using (auth.uid() = user_id);

drop policy if exists "bills_insert_own" on bills;
create policy "bills_insert_own" on bills
  for insert with check (auth.uid() = user_id);

drop policy if exists "bills_update_own" on bills;
create policy "bills_update_own" on bills
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bills_delete_own" on bills;
create policy "bills_delete_own" on bills
  for delete using (auth.uid() = user_id);

-- Generic ownership check for child tables: the parent bill belongs to the user.
create or replace function owns_bill(target_bill_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from bills
    where bills.id = target_bill_id
      and bills.user_id = auth.uid()
  );
$$;

-- charges
drop policy if exists "charges_all_own" on charges;
create policy "charges_all_own" on charges
  for all using (owns_bill(bill_id)) with check (owns_bill(bill_id));

-- flags
drop policy if exists "flags_all_own" on flags;
create policy "flags_all_own" on flags
  for all using (owns_bill(bill_id)) with check (owns_bill(bill_id));

-- rights
drop policy if exists "rights_all_own" on rights;
create policy "rights_all_own" on rights
  for all using (owns_bill(bill_id)) with check (owns_bill(bill_id));

-- dispute_notes
drop policy if exists "dispute_notes_all_own" on dispute_notes;
create policy "dispute_notes_all_own" on dispute_notes
  for all using (owns_bill(bill_id)) with check (owns_bill(bill_id));
