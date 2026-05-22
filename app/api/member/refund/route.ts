import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? null;
const TIMEZONE_OFFSET_MINUTES = Number(process.env.PAPEL_TIMEZONE_OFFSET || 180);

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID;
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getTodayStartLocal = () => {
  const now = new Date();
  const localMs = now.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000;
  const local = new Date(localMs);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
};

const getBalance = async (supabase: SupabaseClient, userId: string, primaryGuildId: string, fallbackGuildId: string) => {
  const { data: walletRows } = await supabase
    .from('member_wallets')
    .select('balance,guild_id')
    .or(`guild_id.eq.${primaryGuildId},guild_id.eq.${fallbackGuildId}`)
    .eq('user_id', userId);

  const rows = (walletRows as Array<{ balance?: number; guild_id?: string }> | null) ?? [];
  const wallet = rows.find(row => row.guild_id === primaryGuildId) ?? rows[0];
  return {
    balance: Number(wallet?.balance ?? 0),
    guildId: wallet?.guild_id ?? primaryGuildId,
  };
};

const setBalance = async (supabase: SupabaseClient, userId: string, guildId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: guildId,
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'transactions']);
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

  const payload = (await request.json()) as { orderId?: string };
  if (!payload.orderId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: order } = (await supabase
    .from('store_orders')
    .select('id,amount,status,created_at')
    .eq('id', payload.orderId)
    .eq('server_id', server.id)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { id: string; amount: number; status: string; created_at: string } | null };

  if (!order) {
    return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  }

  const todayStart = getTodayStartLocal();
  const createdAt = new Date(order.created_at);
  if (order.status !== 'pending' || createdAt < todayStart) {
    return NextResponse.json({ error: 'refund_window_closed' }, { status: 400 });
  }

  await supabase.from('store_orders').update({ status: 'refunded' }).eq('id', order.id);

  const senderBalance = await getBalance(supabase, userId, selectedGuildId ?? server.id, server.id);
  const nextBalance = Number((senderBalance.balance + Number(order.amount)).toFixed(2));
  await setBalance(supabase, userId, senderBalance.guildId, nextBalance);
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: senderBalance.guildId,
    user_id: userId,
    amount: Number(order.amount),
    type: 'refund',
    balance_after: nextBalance,
    metadata: { orderId: order.id },
  });

  return NextResponse.json({ status: 'ok', balance: nextBalance });
}
