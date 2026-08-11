import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isLocalDevRequest, localDevLoadAccrued } from '@/lib/localDev';
import { insertEarnMail } from '@/lib/earnMail';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const assertNoError = (label: string, error: { message?: string; code?: string } | null) => {
  if (!error) return;
  const msg = `[load-accrued] ${label} failed: ${error.code ?? 'unknown'} ${error.message ?? ''}`.trim();
  throw new Error(msg);
};

const isDebugRequest = (request: Request): boolean => {
  try {
    const url = new URL(request.url);
    const flag = url.searchParams.get('debug');
    return flag === '1' || flag === 'true';
  } catch {
    return false;
  }
};

/** GET — return pending (unsettled) earnings summary without claiming */
export async function GET(request: Request) {
  if (isLocalDevRequest(request)) {
    return NextResponse.json(localDevLoadAccrued);
  }

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const selectedGuildId = await getSelectedGuildId(request);
  const debugEnabled = isDebugRequest(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'guild_not_selected' }, { status: 400 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  const guildCandidates = server
    ? Array.from(new Set([server.id, selectedGuildId]))
    : [selectedGuildId];
  const { data: rows } = await supabase
    .from('daily_earnings')
    .select('amount,source')
    .in('guild_id', guildCandidates)
    .eq('user_id', userId)
    .is('settled_at', null)
    .is('deleted_at', null);

  if (!rows || rows.length === 0) {
    return NextResponse.json({
      pending: 0,
      messageTotal: 0,
      voiceTotal: 0,
      count: 0,
      ...(debugEnabled
        ? { debug: { selectedGuildId, serverFound: Boolean(server), serverId: server?.id ?? null, matchedRows: 0, guildCandidates } }
        : {}),
    });
  }

  let messageTotal = 0;
  let voiceTotal = 0;
  for (const r of rows) {
    const amt = Number(r.amount ?? 0);
    if (r.source === 'voice') voiceTotal += amt;
    else messageTotal += amt;
  }

  const pending = Number((messageTotal + voiceTotal).toFixed(2));
  return NextResponse.json({
    pending,
    messageTotal: Number(messageTotal.toFixed(2)),
    voiceTotal: Number(voiceTotal.toFixed(2)),
    count: rows.length,
    ...(debugEnabled
      ? {
          debug: {
            selectedGuildId,
            serverFound: true,
            serverId: server?.id ?? null,
            matchedRows: rows.length,
          },
        }
      : {}),
  });
}

/** POST — claim (settle) all pending earnings into wallet */
export async function POST(request: Request) {
  try {
    if (isLocalDevRequest(request)) {
      return NextResponse.json({ claimed: localDevLoadAccrued.pending, ...localDevLoadAccrued });
    }

    const debugEnabled = isDebugRequest(request);
    const maintenance = await checkMaintenance(['site']);
    if (maintenance.blocked) {
      return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

    const session = await requireSessionUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'guild_not_selected' }, { status: 400 });
    }

    // Find server internal id if available, but keep selectedGuildId as the source of truth.
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .eq('is_setup', true)
      .maybeSingle();

    const guildCandidates = server
      ? Array.from(new Set([server.id, selectedGuildId]))
      : [selectedGuildId];
    const { data: rowsData } = await supabase
      .from('daily_earnings')
      .select('id,amount,source,created_at')
      .in('guild_id', guildCandidates)
      .eq('user_id', userId)
      .is('settled_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    type DailyEarningRow = {
      id: string;
      amount?: number | null;
      source?: string | null;
    };

    const rows = (rowsData ?? []) as DailyEarningRow[];
    if (rows.length === 0) {
      return NextResponse.json({
        totalTransferred: 0,
        count: 0,
        ...(debugEnabled
          ? {
              debug: {
                selectedGuildId,
                serverFound: Boolean(server),
                serverId: server?.id ?? null,
                matchedRows: 0,
                guildCandidates,
              },
            }
          : {}),
      });
    }

    // Sum amounts
    const safeAmount = (value: unknown): number => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (typeof value === 'string') {
        const normalized = value.replace(',', '.').trim();
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };
    const total = Number(rows.reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2));

    type WalletRow = {
      balance?: number;
      reserved_balance?: number;
      guild_id?: string;
    };

    // Get current balance, preferring the selected guild wallet row but falling back to the server row if needed.
    const { data: walletRowsData } = await supabase
      .from('member_wallets')
      .select('balance,reserved_balance,guild_id')
      .in('guild_id', guildCandidates)
      .eq('user_id', userId);
      
    const walletRowsList = (walletRowsData ?? []) as Array<WalletRow>;
    const walletRowSelected = walletRowsList.find(row => row.guild_id === selectedGuildId);
    const walletRowServer = walletRowsList.find(row => row.guild_id === server?.id);

    let currentBalance = 0;
    let currentReserved = 0;

    if (walletRowSelected) {
      currentBalance += Number(walletRowSelected.balance ?? 0);
      currentReserved += Number(walletRowSelected.reserved_balance ?? 0);
    }
    if (walletRowServer && walletRowServer.guild_id !== selectedGuildId) {
      currentBalance += Number(walletRowServer.balance ?? 0);
      currentReserved += Number(walletRowServer.reserved_balance ?? 0);
    }

    const walletGuildId = selectedGuildId;
    const msgTotal = Number(
      rows.filter((r) => r.source === 'message').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2),
    );
    const voiceTotal = Number(
      rows.filter((r) => r.source === 'voice').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2),
    );

    const sendRejectMail = async (reason: 'claim_failed' | 'wallet_failed' | 'settle_failed') => {
      try {
        await insertEarnMail(supabase, {
          guildId: selectedGuildId,
          userId,
          kind: 'earn_rejected',
          total,
          messageTotal: msgTotal,
          voiceTotal,
          rowCount: rows.length,
          reason,
        });
      } catch (mailErr) {
        console.error('[load-accrued] reject mail send failed', mailErr);
      }
    };

    // Upsert new balance (final) — Papel only; Mari kişisel cüzdanda (lib/mariWallet)
    const finalBalance = Number((currentBalance + total).toFixed(2));
    const walletUpsertRes = await (supabase.from('member_wallets') as unknown as {
      upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
    }).upsert({
      guild_id: walletGuildId,
      user_id: userId,
      balance: finalBalance,
      reserved_balance: currentReserved,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,user_id' });
    
    // Eski split-brain satırı varsa tamamen sil ki migration tamamlansın
    if (walletRowServer && walletRowServer.guild_id !== selectedGuildId) {
      await supabase.from('member_wallets').delete()
        .eq('guild_id', walletRowServer.guild_id)
        .eq('user_id', userId);
    }
    try {
      assertNoError('wallet_upsert', (walletUpsertRes as { error?: { message?: string; code?: string } }).error ?? null);
    } catch (err) {
      await sendRejectMail('wallet_failed');
      throw err;
    }

    // Insert single ledger entry with a stable/known type.
    const ledgerInsertRes = await (supabase.from('wallet_ledger') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      guild_id: walletGuildId,
      user_id: userId,
      amount: total,
      type: 'earn',
      balance_after: finalBalance,
      metadata: {
        source: 'manual_claim',
        row_count: rows.length,
        message_total: msgTotal,
        voice_total: voiceTotal,
      },
    });
    try {
      assertNoError('wallet_ledger_insert', (ledgerInsertRes as { error?: { message?: string; code?: string } }).error ?? null);
    } catch (err) {
      await sendRejectMail('wallet_failed');
      throw err;
    }

    // Mark daily_earnings as settled to avoid re-loading
    const ids = rows.map(r => r.id);
    const settleRes = await supabase
      .from('daily_earnings')
      .update({ settled_at: new Date().toISOString() })
      .in('id', ids);
    try {
      assertNoError('daily_earnings_settle', settleRes.error ?? null);
    } catch (err) {
      await sendRejectMail('settle_failed');
      throw err;
    }

    // Send claim mail
    try {
      await insertEarnMail(supabase, {
        guildId: selectedGuildId,
        userId,
        kind: 'earn_claim',
        total,
        messageTotal: msgTotal,
        voiceTotal,
        rowCount: rows.length,
      });
    } catch (mailErr) {
      console.error('[load-accrued] mail send failed', mailErr);
    }

    return NextResponse.json({
      status: 'ok',
      totalTransferred: total,
      count: rows.length,
      ...(debugEnabled
        ? {
            debug: {
              selectedGuildId,
              serverFound: true,
              serverId: server?.id ?? null,
              matchedRows: rows.length,
              walletGuildId,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error('[load-accrued] POST error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
