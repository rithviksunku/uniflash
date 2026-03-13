-- Run this once in the Supabase SQL Editor to create the keepalive table.
-- Dashboard → SQL Editor → paste → Run

create table if not exists _keepalive (
  id        bigserial primary key,
  pinged_at timestamptz not null default now()
);

-- Only the service-role key (used by the script) bypasses RLS, so no
-- permissive policies are needed. Enable RLS to block public access.
alter table _keepalive enable row level security;

-- Optional: human-readable comment in the dashboard
comment on table _keepalive is
  'Dummy table pinged by a scheduled script to prevent project inactivity pause.';
