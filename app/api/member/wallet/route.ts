import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID;
};

const getTodayStartIso = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

export async function GET() {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      balance: 1000,
      total_earned: 1000,
      total_spent: 0,
      daily_reward: 100,
      last_daily: null,
      streak: 0,
      transactions_count: 0
    });
  }

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const { data: server } = await supabase
    .from('servers')
    .select('id,transfer_daily_limit,transfer_tax_rate')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: sentToday } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .eq('type', 'transfer_out')
    .gte('created_at', getTodayStartIso());

  const totalSent = sentToday?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    dailyLimit: server.transfer_daily_limit,
    taxRate: server.transfer_tax_rate,
    sentToday: totalSent,
  });
}
