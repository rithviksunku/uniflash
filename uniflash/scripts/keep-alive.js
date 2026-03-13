/**
 * Supabase keep-alive script
 *
 * Inserts a row into the `_keepalive` table then deletes rows older than
 * 1 day, keeping the table tiny while still generating real DB activity.
 *
 * Requires the SERVICE ROLE key (not the anon key) so it bypasses RLS.
 *
 * ─── Local run ───────────────────────────────────────────────────────────
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/keep-alive.js
 *
 * Or with Node 20+ and a .env file:
 *   node --env-file=.env.local scripts/keep-alive.js
 *
 * ─── Automated ───────────────────────────────────────────────────────────
 *   See .github/workflows/keep-alive.yml — GitHub Actions runs this free
 *   on a schedule every 3 days.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function ping() {
  const now = new Date().toISOString();
  console.log(`[${now}] Pinging Supabase…`);

  // 1. Insert a heartbeat row
  const { error: insertError } = await supabase
    .from('_keepalive')
    .insert({ pinged_at: now });

  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }
  console.log('  ✓ Inserted heartbeat row');

  // 2. Delete rows older than 1 day to keep the table clean
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error: deleteError, count } = await supabase
    .from('_keepalive')
    .delete({ count: 'exact' })
    .lt('pinged_at', cutoff);

  if (deleteError) {
    console.error('Delete failed:', deleteError.message);
    process.exit(1);
  }
  console.log(`  ✓ Cleaned up ${count ?? 0} old row(s)`);
  console.log('Done.');
}

ping();
