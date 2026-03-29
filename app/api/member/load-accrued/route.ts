import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const selectedGuildId = await getSelectedGuildId(request);

  // Find server internal id
  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });

  // Fetch unsettled daily_earnings for this user + guild
  const { data: rows } = await supabase
    .from('daily_earnings')
    .select('id,amount,source,metadata,created_at')
    .eq('guild_id', server.id)
    .eq('user_id', userId)
    .is('settled_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!rows || rows.length === 0) {
    return NextResponse.json({ totalTransferred: 0, count: 0 });
  }

  // Sum amounts
  const total = Number(rows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0).toFixed(2));

  // Get current balance
  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', server.id)
    .eq('user_id', userId)
    .maybeSingle();

  const current = Number(wallet?.balance ?? 0);
  let running = current;

  // Upsert new balance (final)
  const finalBalance = Number((current + total).toFixed(2));
  await (supabase.from('member_wallets') as any).upsert({
    guild_id: server.id,
    user_id: userId,
    balance: finalBalance,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'guild_id,user_id' });

  // Insert ledger entries per row (incrementing balance_after)
  for (const r of rows) {
    const amt = Number(r.amount ?? 0);
    running = Number((running + amt).toFixed(2));
    const type = r.source === 'voice' ? 'earn_voice' : 'earn_message';
    await (supabase.from('wallet_ledger') as any).insert({
      guild_id: server.id,
      user_id: userId,
      amount: amt,
      type,
      balance_after: running,
      metadata: r.metadata ?? {},
    });
  }

  // Mark daily_earnings as settled to avoid re-loading
  const ids = rows.map((r: any) => r.id);
  await supabase.from('daily_earnings').update({ settled_at: new Date().toISOString() }).in('id', ids as any[]);

  return NextResponse.json({ status: 'ok', totalTransferred: total, count: rows.length });
}
