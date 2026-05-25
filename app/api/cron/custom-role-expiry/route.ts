/**
 * Auth: ?secret=$QUIZ_CRON_SECRET veya Authorization: Bearer $QUIZ_CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteGuildRole } from '@/lib/customRoles/discord';

export const dynamic = 'force-dynamic';

function checkSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET ?? process.env.QUIZ_CRON_SECRET;
  if (!expected) return false;
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('secret');
  const auth = request.headers.get('authorization');
  const fromHeader = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  return fromQuery === expected || fromHeader === expected;
}

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: NextRequest) {
  if (!checkSecret(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const now = new Date().toISOString();
  const { data: expired } = await supabase
    .from('custom_role_requests')
    .select('id, guild_id, discord_role_id')
    .eq('status', 'active')
    .not('discord_role_id', 'is', null)
    .lte('expires_at', now)
    .limit(50);

  let deleted = 0;
  for (const row of expired ?? []) {
    if (!row.discord_role_id) continue;
    try {
      await deleteGuildRole(botToken, row.guild_id, row.discord_role_id);
      await supabase
        .from('custom_role_requests')
        .update({ status: 'expired', updated_at: now })
        .eq('id', row.id);
      deleted += 1;
    } catch (e) {
      console.warn('[custom-role-expiry]', row.id, e);
    }
  }

  return NextResponse.json({ processed: expired?.length ?? 0, deleted });
}
