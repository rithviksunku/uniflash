-- Run this once in the Supabase SQL Editor to create the keepalive table.
-- Dashboard → SQL Editor → paste → Run

create table if not exists _keepalive (
  id        bigserial primary key,
  pinged_at timestamptz not null default now()
);

-- Enable RLS
alter table _keepalive enable row level security;

-- Allow the anon role (used by the keep-alive script) to read, insert, update, delete
create policy "anon can select" on _keepalive
  for select to anon using (true);

create policy "anon can insert" on _keepalive
  for insert to anon with check (true);

create policy "anon can update" on _keepalive
  for update to anon using (true);

create policy "anon can delete" on _keepalive
  for delete to anon using (true);

-- Optional: human-readable comment in the dashboard
comment on table _keepalive is
  'Dummy table pinged by a scheduled script to prevent project inactivity pause.';
