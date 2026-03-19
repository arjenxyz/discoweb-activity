import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { logWebEvent } from '@/lib/serverLogger';
import { getSessionUserId } from '@/lib/auth';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? null;

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getBalance = async (supabase: SupabaseClient, userId: string, serverId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', serverId)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number } | null };

  return Number(data?.balance ?? 0);
};

const setBalance = async (supabase: SupabaseClient, userId: string, serverId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: serverId,
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

const addLedger = async (supabase: SupabaseClient, userId: string, serverId: string, amount: number, balanceAfter: number, promoId: string) => {
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: serverId,
    user_id: userId,
    amount,
    type: 'promotion',
    balance_after: balanceAfter,
    metadata: { promoId },
  });
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'promotions']);
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

  const cookieStore = await cookies();
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const payload = (await request.json()) as { code?: string };
  const code = payload.code?.trim();
  if (!code) {
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

  const { data: promo } = await supabase
    .from('promotions')
    .select('id,code,value,status,expires_at,max_uses,used_count')
    .eq('server_id', server.id)
    .ilike('code', code)
    .maybeSingle();

  if (!promo || promo.status !== 'active') {
    return NextResponse.json({ error: 'invalid_code' }, { status: 404 });
  }

  if (promo.expires_at && new Date(promo.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }

  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: 'limit_reached' }, { status: 400 });
  }

  const currentBalance = await getBalance(supabase, userId, server.id);
  const packageAmount = Number(promo.value);
  const newBalance = Number((currentBalance + packageAmount).toFixed(2));

  const { error: updateError } = await supabase
    .from('promotions')
    .update({ used_count: (promo.used_count ?? 0) + 1 })
    .eq('id', promo.id);

  if (updateError) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  await setBalance(supabase, userId, server.id, newBalance);
  await addLedger(supabase, userId, server.id, packageAmount, newBalance, promo.id);

  await logWebEvent(request, {
    event: 'store_promo_redeem',
    status: 'success',
    userId,
    guildId: selectedGuildId,
    metadata: {
      promoId: promo.id,
      code: promo.code,
      value: promo.value,
      maxUses: promo.max_uses ?? null,
      usedCount: (promo.used_count ?? 0) + 1,
      expiresAt: promo.expires_at ?? null,
      balanceAfter: newBalance,
    },
  });

  return NextResponse.json({ code: promo.code, amount: packageAmount, balance: newBalance });
}
