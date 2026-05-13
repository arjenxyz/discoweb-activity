import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { requireSessionUser } from '@/lib/auth';

const DEFAULT_SLUG = 'default';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? null;

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

const getSenderLabel = async (userId: string, guildId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return userId;
  }

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!response.ok) {
    return userId;
  }

  const member = (await response.json()) as { nick?: string; user?: { username?: string } };
  return member.nick ?? member.user?.username ?? userId;
};

const ensureRecipientInGuild = async (guildId: string | null, userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !guildId) return true;
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  return response.ok;
};

const getTodayStartIso = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  return start.toISOString();
};

const getBalance = async (supabase: SupabaseClient, userId: string, guildId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance,mari_balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: number; mari_balance?: number } | null };

  return {
    balance: Number(data?.balance ?? 0),
    mariBalance: Number(data?.mari_balance ?? 0),
  };
};

const setBalance = async (supabase: SupabaseClient, userId: string, guildId: string, balance: number, mariBalance?: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert({
    guild_id: guildId,
    user_id: userId,
    balance,
    ...(typeof mariBalance === 'number' ? { mari_balance: mariBalance } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'guild_id,user_id' });
};

const addLedger = async (
  supabase: SupabaseClient,
  userId: string,
  guildId: string,
  amount: number,
  type: 'transfer_in' | 'transfer_out' | 'transfer_tax',
  balanceAfter: number,
  metadata: Record<string, unknown>,
) => {
  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: guildId,
    user_id: userId,
    amount,
    type,
    balance_after: balanceAfter,
    metadata,
  });
};

const insertNotification = async (supabase: SupabaseClient, userId: string, guildId: string, title: string, body: string) => {
  await (supabase.from('notifications') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: guildId,
    title,
    body,
    type: 'mail',
    status: 'published',
    target_user_id: userId,
  });
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'transfers']);
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

  const selectedGuildId = await getSelectedGuildId();

  const payload = (await request.json()) as { recipientId?: string; amount?: number };
  if (!payload.recipientId || typeof payload.amount !== 'number') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (payload.amount <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  if (payload.recipientId === userId) {
    return NextResponse.json({ error: 'self_transfer' }, { status: 400 });
  }

  if (!(await ensureRecipientInGuild(selectedGuildId, payload.recipientId))) {
    return NextResponse.json({ error: 'recipient_not_found' }, { status: 404 });
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

  const { data: sentToday } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('guild_id', server.id)
    .eq('user_id', userId)
    .eq('type', 'transfer_out')
    .gte('created_at', getTodayStartIso());

  const totalSent = sentToday?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;
  if (totalSent + payload.amount > Number(server.transfer_daily_limit)) {
    return NextResponse.json({ error: 'daily_limit_exceeded' }, { status: 400 });
  }

  const taxRate = Number(server.transfer_tax_rate ?? 0);
  const taxAmount = Number((payload.amount * taxRate).toFixed(2));
  const totalDebit = Number((payload.amount + taxAmount).toFixed(2));

  const senderBalance = await getBalance(supabase, userId, server.id);
  const mariFee = 1;
  if (senderBalance.balance < totalDebit) {
    return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });
  }
  if (senderBalance.mariBalance < mariFee) {
    return NextResponse.json({ error: 'insufficient_mari' }, { status: 400 });
  }

  const receiverBalance = await getBalance(supabase, payload.recipientId, server.id);

  const newSenderBalance = Number((senderBalance.balance - totalDebit).toFixed(2));
  const newReceiverBalance = Number((receiverBalance.balance + payload.amount).toFixed(2));
  const newSenderMariBalance = Number((senderBalance.mariBalance - mariFee).toFixed(3));

  await setBalance(supabase, userId, server.id, newSenderBalance, newSenderMariBalance);
  await addLedger(supabase, userId, server.id, payload.amount, 'transfer_out', newSenderBalance, {
    recipientId: payload.recipientId,
    tax: taxAmount,
    mari_fee: mariFee,
  });
  if (taxAmount > 0) {
    await addLedger(supabase, userId, server.id, taxAmount, 'transfer_tax', newSenderBalance, {
      recipientId: payload.recipientId,
    });
  }

  await setBalance(supabase, payload.recipientId, server.id, newReceiverBalance, receiverBalance.mariBalance);
  await addLedger(supabase, payload.recipientId, server.id, payload.amount, 'transfer_in', newReceiverBalance, {
    senderId: userId,
  });

  await insertNotification(
    supabase,
    payload.recipientId,
    server.id,
    'Papel transferi aldınız',
    `Size ${payload.amount} papel gönderildi. Gönderen: ${await getSenderLabel(userId, selectedGuildId ?? '')}`,
  );

  return NextResponse.json({
    status: 'ok',
    senderBalance: newSenderBalance,
    senderMariBalance: newSenderMariBalance,
    mariFee,
    receiverBalance: newReceiverBalance,
    taxAmount,
  });
}
