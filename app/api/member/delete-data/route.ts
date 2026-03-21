import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const deleteForUser = async (
  supabase: SupabaseClient,
  userId: string,
  scope: 'current' | 'all',
  guildId: string | null,
) => {
  const tables = [
    'member_wallets',
    'wallet_ledger',
    'member_overview_stats',
    'member_daily_stats',
    'member_profiles',
    'member_transactions',
    'member_raffles',
    'member_referral',
    'member_promotion_uses',
  ];

  for (const table of tables) {
    if (scope === 'current' && guildId) {
      await supabase.from(table).delete().match({ user_id: userId, guild_id: guildId });
    } else {
      await supabase.from(table).delete().match({ user_id: userId });
    }
  }
};

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }

  const userId = session.userId;

  const selectedGuildId = await getSelectedGuildId(request);

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance' }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({ scope: 'current' }));
  const scope = body?.scope === 'all' ? 'all' : 'current';

  if (scope === 'current' && !selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });
  }

  try {
    await deleteForUser(supabase, userId, scope, selectedGuildId);
    return NextResponse.json({ status: 'ok', scope, guildId: selectedGuildId });
  } catch (err) {
    console.error('delete-data error', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
