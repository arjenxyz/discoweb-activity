import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(req: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const cookieStore = await cookies();
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const rangeHours = Number(url.searchParams.get('rangeHours') ?? '24');

  const selectedGuildId = await getSelectedGuildId();

  // compute start date for daily stats (floor to date)
  const now = new Date();
  const start = new Date(now.getTime() - Math.max(1, rangeHours) * 60 * 60 * 1000);
  const startDate = start.toISOString().split('T')[0];

  try {
    const { data: serverRow } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();
    const serverId = serverRow?.id;

    const [
      { data: overview },
      { data: rangeTotals },
      { count: totalMembers },
      { count: totalWallets },
      { data: economyData },
      { count: pendingOrders },
      { count: paidOrders },
      { count: activeStoreItems },
      { count: tagCount },
      { count: boosterCount },
    ] = await Promise.all([
      supabase.from('server_overview_stats').select('total_messages,total_voice_minutes').eq('guild_id', selectedGuildId).maybeSingle(),
      supabase
        .from('server_daily_stats')
        .select('message_count,voice_minutes')
        .eq('guild_id', selectedGuildId)
        .gte('stat_date', startDate),
      supabase.from('member_overview_stats').select('user_id', { count: 'exact', head: true }).eq('guild_id', selectedGuildId),
      supabase.from('member_wallets').select('user_id', { count: 'exact', head: true }).eq('guild_id', selectedGuildId),
      supabase.from('member_wallets').select('balance').eq('guild_id', selectedGuildId),
      serverId
        ? supabase.from('store_orders').select('id', { count: 'exact', head: true }).eq('server_id', serverId).eq('status', 'pending')
        : Promise.resolve({ count: 0 }),
      serverId
        ? supabase.from('store_orders').select('id', { count: 'exact', head: true }).eq('server_id', serverId).eq('status', 'paid')
        : Promise.resolve({ count: 0 }),
      serverId
        ? supabase.from('store_items').select('id', { count: 'exact', head: true }).eq('server_id', serverId).eq('status', 'active')
        : Promise.resolve({ count: 0 }),
      supabase.from('member_profiles').select('user_id', { count: 'exact', head: true }).eq('guild_id', selectedGuildId).eq('has_tag', true),
      supabase.from('member_profiles').select('user_id', { count: 'exact', head: true }).eq('guild_id', selectedGuildId).eq('is_booster', true),
    ]);

    let rangeMessages = 0;
    let rangeVoiceMinutes = 0;
    if (Array.isArray(rangeTotals)) {
      for (const r of rangeTotals) {
        rangeMessages += Number(r.message_count ?? 0);
        rangeVoiceMinutes += Number(r.voice_minutes ?? 0);
      }
    }

    // Economy calculations
    let totalCirculation = 0;
    let highestBalance = 0;
    if (Array.isArray(economyData)) {
      for (const w of economyData) {
        const bal = Number(w.balance ?? 0);
        totalCirculation += bal;
        if (bal > highestBalance) highestBalance = bal;
      }
    }
    const avgBalance = (totalWallets ?? 0) > 0 ? totalCirculation / (totalWallets ?? 1) : 0;

    return NextResponse.json({
      rangeHours,
      rangeMessages,
      rangeVoiceMinutes,
      totalMessages: Number(overview?.total_messages ?? 0),
      totalVoiceMinutes: Number(overview?.total_voice_minutes ?? 0),
      // member stats
      totalMembers: totalMembers ?? 0,
      totalWallets: totalWallets ?? 0,
      // economy
      totalCirculation,
      avgBalance: Math.round(avgBalance * 100) / 100,
      highestBalance,
      // store
      pendingOrders: pendingOrders ?? 0,
      paidOrders: paidOrders ?? 0,
      activeStoreItems: activeStoreItems ?? 0,
      // tag/boost
      tagCount: tagCount ?? 0,
      boosterCount: boosterCount ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: 'query_failed', detail: String(err) }, { status: 500 });
  }
}
