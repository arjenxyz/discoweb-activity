import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { requireSessionUser } from '@/lib/auth';
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

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;

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
    .select('balance,mari_balance,reserved_balance,mari_reserved,guild_id')
    .or(`guild_id.eq.${selectedGuildId},guild_id.eq.${server.id}`)
    .eq('user_id', userId);
  const walletRows = (walletRowsResponse.data ?? []) as Array<{
    balance?: number;
    mari_balance?: number;
    reserved_balance?: number;
    mari_reserved?: number;
    guild_id?: string;
  }>;

  const walletSelected = walletRows.find(row => row.guild_id === selectedGuildId);
  const walletServer = walletRows.find(row => row.guild_id === server.id);

  let balance = 0;
  let mari_balance = 0;
  let reserved_balance = 0;
  let mari_reserved = 0;

  if (walletSelected) {
    balance += Number(walletSelected.balance ?? 0);
    mari_balance += Number(walletSelected.mari_balance ?? 0);
    reserved_balance += Number(walletSelected.reserved_balance ?? 0);
    mari_reserved += Number(walletSelected.mari_reserved ?? 0);
  }
  if (walletServer && walletServer.guild_id !== selectedGuildId) {
    balance += Number(walletServer.balance ?? 0);
    mari_balance += Number(walletServer.mari_balance ?? 0);
    reserved_balance += Number(walletServer.reserved_balance ?? 0);
    mari_reserved += Number(walletServer.mari_reserved ?? 0);
  }

  // Eğer eski sunucu UUID tabanlı satır varsa ve yeni discord sunucu ID satırıyla birleştirildiyse:
  if (walletServer && walletServer.guild_id !== selectedGuildId) {
    await supabase.from('member_wallets').upsert({
      guild_id: selectedGuildId,
      user_id: userId,
      balance,
      mari_balance,
      reserved_balance,
      mari_reserved,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,user_id' });

    // Eski satırı tamamen temizle, split-brain kalmasın
    await supabase.from('member_wallets').delete()
      .eq('guild_id', walletServer.guild_id)
      .eq('user_id', userId);
  } else if (!walletSelected && walletRows.length === 0) {
    // Eğer kullanıcıya ait cüzdan satırı yoksa (ne UUID ne Discord ID) otomatik oluştur
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
    balance,
    mari_balance,
    dailyLimit: server.transfer_daily_limit,
    taxRate: server.transfer_tax_rate,
    sentToday: totalSent,
  });
}
