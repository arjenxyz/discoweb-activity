import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getTodayStartIso = (): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
};

export async function GET(request: Request) {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      balance: 1000,
      mari_balance: 10,
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

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id,transfer_daily_limit,transfer_tax_rate')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const walletRowsResponse = await supabase
    .from('member_wallets')
    .select('balance,mari_balance,guild_id')
    .or(`guild_id.eq.${selectedGuildId},guild_id.eq.${server.id}`);
  const walletRows = walletRowsResponse.data ?? [];
  const wallet = (walletRows as Array<{ balance?: number; mari_balance?: number; guild_id?: string }>)
    .find(row => row.guild_id === selectedGuildId) ?? walletRows[0];

  // Eğer kullanıcıya ait cüzdan satırı yoksa otomatik oluştur
  if (!wallet) {
    const { error: walletCreateError } = await supabase.from('member_wallets').upsert(
      {
        guild_id: selectedGuildId,
        user_id: userId,
        balance: 0,
        mari_balance: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guild_id,user_id' },
    );
    if (walletCreateError) {
      console.error('Wallet auto-create failed:', walletCreateError);
      return NextResponse.json({ error: 'wallet_init_failed' }, { status: 500 });
    }
  }

  const { data: sentToday } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .or(`guild_id.eq.${selectedGuildId},guild_id.eq.${server.id}`)
    .eq('user_id', userId)
    .eq('type', 'transfer_out')
    .gte('created_at', getTodayStartIso());

  const totalSent = sentToday?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;

  return NextResponse.json({
    balance: wallet?.balance ?? 0,
    mari_balance: wallet?.mari_balance ?? 0,
    dailyLimit: server.transfer_daily_limit,
    taxRate: server.transfer_tax_rate,
    sentToday: totalSent,
  });
}
