/**
 * Supabase keep-alive script
 *
 * Performs several distinct DB operations (SELECT, INSERT, UPDATE, DELETE)
 * so the project registers meaningful activity against Supabase's 7-day
 * inactivity threshold.  The workflow runs this 3× per day.
 *
 * Uses the anon key with RLS policies on the _keepalive table.
 *
 * ─── Local run ───────────────────────────────────────────────────────────
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   node scripts/keep-alive.js
 *
 *   Node 20+: node --env-file=.env.local scripts/keep-alive.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars: SUPABASE_URL and SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function run(label, fn) {
  const { error } = await fn();
  if (error) { console.error(`  ✗ ${label}: ${error.message}`); process.exit(1); }
  log(`  ✓ ${label}`);
}

async function ping() {
  log('Starting keep-alive ping…');

  // 1. SELECT — read existing rows
  await run('SELECT rows', () =>
    supabase.from('_keepalive').select('id, pinged_at').order('pinged_at', { ascending: false }).limit(5)
  );

  // 2. INSERT — new heartbeat row
  const now = new Date().toISOString();
  let insertedId;
  const { data: inserted, error: insertErr } = await supabase
    .from('_keepalive')
    .insert({ pinged_at: now })
    .select('id')
    .single();
  if (insertErr) { console.error(`  ✗ INSERT: ${insertErr.message}`); process.exit(1); }
  insertedId = inserted.id;
  log(`  ✓ INSERT row id=${insertedId}`);

  // 3. UPDATE — touch the row we just inserted
  await run('UPDATE row', () =>
    supabase.from('_keepalive').update({ pinged_at: new Date().toISOString() }).eq('id', insertedId)
  );

  // 4. SELECT again — confirm the update
  await run('SELECT updated row', () =>
    supabase.from('_keepalive').select('id, pinged_at').eq('id', insertedId).single()
  );

  // 5. DELETE — clean up rows older than 2 days
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { error: delErr, count } = await supabase
    .from('_keepalive')
    .delete({ count: 'exact' })
    .lt('pinged_at', cutoff);
  if (delErr) { console.error(`  ✗ DELETE old rows: ${delErr.message}`); process.exit(1); }
  log(`  ✓ DELETE ${count ?? 0} old row(s)`);

  log('Done — 5 requests completed.');
}

ping();
