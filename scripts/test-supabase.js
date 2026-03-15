import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) process.env[key] = value;
  }
}

const envPath = path.resolve(process.cwd(), '.env.local');
loadEnvFile(envPath);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  try {
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    const { data, error, status } = await supabase
      .from('member_profiles')
      .select('id,guild_id,user_id')
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      process.exit(1);
    }

    console.log('Supabase query status:', status);
    console.log('Sample row (if any):', data);

    // Verify activity tables by selecting expected columns
    const { data: sessions, error: sessionsError } = await supabase
      .from('activity_sessions')
      .select('id,guild_id,channel_id,invite_code,activity_app_id,created_by,created_at,expires_at,metadata')
      .limit(1);
    console.log('activity_sessions query error:', sessionsError);
    console.log('activity_sessions sample:', sessions);

    const { data: participation, error: participationError } = await supabase
      .from('activity_participation')
      .select('id,session_id,guild_id,user_id,join_at,leave_at,duration_seconds,awarded,award_amount,metadata')
      .limit(1);
    console.log('activity_participation query error:', participationError);
    console.log('activity_participation sample:', participation);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
