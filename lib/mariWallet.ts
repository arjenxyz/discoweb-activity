/**
 * Kişisel Mari cüzdanı — sunucu/borsa bağımsız.
 * member_wallets satırı: guild_id = MARI_WALLET_GUILD_ID (gerçek Discord sunucusu değil).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** @deprecated PLATFORM_GUILD_ID — borsa kaldırıldı; geriye dönük uyumluluk için okunur */
export const MARI_WALLET_GUILD_ID =
  process.env.MARI_WALLET_GUILD_ID ??
  process.env.PLATFORM_GUILD_ID ??
  '__mari__';

export function roundMari(n: number): number {
  return Number(n.toFixed(6));
}

type WalletMariRow = {
  guild_id: string;
  mari_balance?: number | null;
  mari_reserved?: number | null;
};

/** Eski sunucu satırlarındaki Mari'yi tek kişisel cüzdanda birleştir. */
export async function consolidateLegacyMariBalances(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from('member_wallets')
    .select('guild_id, mari_balance, mari_reserved')
    .eq('user_id', userId);

  const list = (rows ?? []) as WalletMariRow[];
  if (list.length === 0) return;

  const legacy = list.filter(
    (r) =>
      r.guild_id !== MARI_WALLET_GUILD_ID &&
      (Number(r.mari_balance ?? 0) > 0 || Number(r.mari_reserved ?? 0) > 0),
  );
  if (legacy.length === 0) return;

  const mariRow = list.find((r) => r.guild_id === MARI_WALLET_GUILD_ID);
  const legacyBalance = legacy.reduce((s, r) => s + Number(r.mari_balance ?? 0), 0);
  const legacyReserved = legacy.reduce((s, r) => s + Number(r.mari_reserved ?? 0), 0);

  const newBalance = roundMari(Number(mariRow?.mari_balance ?? 0) + legacyBalance);
  const newReserved = roundMari(Number(mariRow?.mari_reserved ?? 0) + legacyReserved);

  await supabase.from('member_wallets').upsert(
    {
      guild_id: MARI_WALLET_GUILD_ID,
      user_id: userId,
      mari_balance: newBalance,
      mari_reserved: newReserved,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  for (const row of legacy) {
    await supabase
      .from('member_wallets')
      .update({
        mari_balance: 0,
        mari_reserved: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', row.guild_id)
      .eq('user_id', userId);
  }
}

export async function getUserMariBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  await consolidateLegacyMariBalances(supabase, userId);
  const { data } = await supabase
    .from('member_wallets')
    .select('mari_balance')
    .eq('guild_id', MARI_WALLET_GUILD_ID)
    .eq('user_id', userId)
    .maybeSingle();
  return roundMari(Number(data?.mari_balance ?? 0));
}

export async function getUserMariAvailable(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  await consolidateLegacyMariBalances(supabase, userId);
  const { data } = await supabase
    .from('member_wallets')
    .select('mari_balance, mari_reserved')
    .eq('guild_id', MARI_WALLET_GUILD_ID)
    .eq('user_id', userId)
    .maybeSingle();
  const bal = Number(data?.mari_balance ?? 0);
  const reserved = Number(data?.mari_reserved ?? 0);
  return roundMari(Math.max(0, bal - reserved));
}

export async function addUserMari(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<number> {
  if (amount <= 0) return getUserMariBalance(supabase, userId);
  const current = await getUserMariBalance(supabase, userId);
  const newBalance = roundMari(current + amount);
  await supabase.from('member_wallets').upsert(
    {
      guild_id: MARI_WALLET_GUILD_ID,
      user_id: userId,
      mari_balance: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
  return newBalance;
}

export async function deductUserMari(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
): Promise<number> {
  const available = await getUserMariAvailable(supabase, userId);
  if (available < amount) {
    throw new Error('insufficient_mari');
  }
  const current = await getUserMariBalance(supabase, userId);
  const newBalance = roundMari(current - amount);
  await supabase.from('member_wallets').upsert(
    {
      guild_id: MARI_WALLET_GUILD_ID,
      user_id: userId,
      mari_balance: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
  return newBalance;
}

export async function insertMariLedger(
  supabase: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    type: string;
    balanceAfter: number;
    metadata?: Record<string, unknown>;
    contextGuildId?: string | null;
  },
): Promise<void> {
  await supabase.from('wallet_ledger').insert({
    guild_id: MARI_WALLET_GUILD_ID,
    user_id: params.userId,
    amount: params.amount,
    type: params.type,
    balance_after: params.balanceAfter,
    metadata: {
      currency: 'mari',
      ...(params.contextGuildId ? { context_guild_id: params.contextGuildId } : {}),
      ...params.metadata,
    },
  });
}
