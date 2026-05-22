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

const normalizeGuildId = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** GET — return pending (unsettled) earnings summary without claiming */
export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const selectedGuildId = normalizeGuildId(await getSelectedGuildId(request));
  const debugEnabled = isDebugRequest(request);
  if (!selectedGuildId) {
    return NextResponse.json({ pending: 0, messageTotal: 0, voiceTotal: 0, count: 0 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({
      pending: 0,
      messageTotal: 0,
      voiceTotal: 0,
      count: 0,
      ...(debugEnabled
        ? { debug: { selectedGuildId, serverFound: false, serverId: null, matchedRows: 0 } }
        : {}),
    });
  }

  // Bot writes daily_earnings with Discord guild ID, so query with both server.id and selectedGuildId
  const guildCandidates = Array.from(new Set([server.id, selectedGuildId].filter(Boolean)));
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
        ? { debug: { selectedGuildId, serverFound: true, serverId: server.id, matchedRows: 0 } }
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
            serverId: server.id,
            matchedRows: rows.length,
          },
        }
      : {}),
  });
}

/** POST — claim (settle) all pending earnings into wallet */
export async function POST(request: Request) {
  try {
    const debugEnabled = isDebugRequest(request);
    const maintenance = await checkMaintenance(['site']);
    if (maintenance.blocked) {
      return NextResponse.json({ error: 'maintenance', key: maintenance.key, reason: maintenance.reason }, { status: 503 });
    }

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const selectedGuildId = normalizeGuildId(await getSelectedGuildId(request));
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'guild_not_selected' }, { status: 400 });
    }

    // Find server internal id
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .eq('is_setup', true)
      .maybeSingle();

    if (!server) {
      return NextResponse.json(
        {
          error: 'server_not_found',
          ...(debugEnabled
            ? { debug: { selectedGuildId, serverFound: false, serverId: null, matchedRows: 0 } }
            : {}),
        },
        { status: 404 },
      );
    }

    // Fetch unsettled daily_earnings for this user + guild (bot may use Discord ID or internal ID)
    const guildCandidates = Array.from(new Set([server.id, selectedGuildId].filter(Boolean)));
    const { data: rowsData } = await supabase
      .from('daily_earnings')
      .select('id,amount,source,metadata,created_at')
      .in('guild_id', guildCandidates)
      .eq('user_id', userId)
      .is('settled_at', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    type DailyEarningRow = {
      id: string;
      amount?: number | null;
      source?: string | null;
      metadata?: Record<string, unknown> | null;
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
                serverFound: true,
                serverId: server.id,
                matchedRows: 0,
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

    type WalletRow = { balance?: number; guild_id?: string };

    // Get current balance, preferring the selected guild wallet row but falling back to the server row if needed.
    const { data: walletRows } = await supabase
      .from('member_wallets')
      .select('balance,guild_id')
      .in('guild_id', guildCandidates)
      .eq('user_id', userId);
    const walletRow = ((walletRows as Array<WalletRow> | null) ?? [])
      .find(row => row.guild_id === selectedGuildId) ?? ((walletRows as Array<WalletRow> | null) ?? [])[0];
    const walletGuildId = walletRow?.guild_id ?? selectedGuildId;

    const current = Number(walletRow?.balance ?? 0);

    // Upsert new balance (final)
    const finalBalance = Number((current + total).toFixed(2));
    const walletUpsertRes = await (supabase.from('member_wallets') as unknown as {
      upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
    }).upsert({
      guild_id: walletGuildId,
      user_id: userId,
      balance: finalBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,user_id' });
    assertNoError('wallet_upsert', (walletUpsertRes as { error?: { message?: string; code?: string } }).error ?? null);

    // Insert single ledger entry with a stable/known type.
    const msgTotal = Number(rows.filter(r => r.source === 'message').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2));
    const voiceTotal = Number(rows.filter(r => r.source === 'voice').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2));
    const ledgerInsertRes = await (supabase.from('wallet_ledger') as unknown as {
      insert: (values: Record<string, unknown>) => Promise<unknown>;
    }).insert({
      guild_id: walletGuildId,
      user_id: userId,
      amount: total,
      type: 'daily_settlement',
      balance_after: finalBalance,
      metadata: {
        source: 'manual_claim',
        row_count: rows.length,
        message_total: msgTotal,
        voice_total: voiceTotal,
      },
    });
    assertNoError('wallet_ledger_insert', (ledgerInsertRes as { error?: { message?: string; code?: string } }).error ?? null);

    // Mark daily_earnings as settled to avoid re-loading
    const ids = rows.map(r => r.id);
    const settleRes = await supabase
      .from('daily_earnings')
      .update({ settled_at: new Date().toISOString() })
      .in('id', ids);
    assertNoError('daily_earnings_settle', settleRes.error ?? null);

    // Send claim mail
    try {
      const msgTotal = Number(rows.filter(r => r.source === 'message').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2));
      const voiceTotal = Number(rows.filter(r => r.source === 'voice').reduce((s: number, r) => s + safeAmount(r.amount), 0).toFixed(2));
      // Use the guild ID that bot writes with (selectedGuildId = Discord guild ID)
      const mailGuildId = selectedGuildId;
      await supabase.from('system_mails').insert({
        guild_id: mailGuildId,
        user_id: userId,
        title: 'Kazançlarınız Hesabınıza Tanımlandı',
        body: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #374151; line-height: 1.6; font-size: 14px; max-width: 600px;">
  <div style="margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 20px;">💰</span>
      <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">Kazançlarınız Hesabınıza Tanımlandı</h1>
    </div>
  </div>
  <div style="margin-bottom: 24px;">
    <p style="margin: 0 0 16px 0; color: #111827; font-weight: 500;">Merhaba,</p>
    <p style="margin: 0 0 16px 0;">Biriken kazançlarınız talebiniz üzerine hesabınıza başarıyla aktarılmıştır.</p>
    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #92400e;">💰 Kazanç Özeti</h3>
      <div style="color: #78350f; font-size: 14px;">
        <p style="margin: 0 0 8px 0;"><strong>Toplam:</strong> ${total} papel</p>
        <p style="margin: 0 0 4px 0;">💬 Mesaj kazancı: ${msgTotal} papel</p>
        <p style="margin: 0 0 4px 0;">🎙️ Ses kazancı: ${voiceTotal} papel</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #a16207;">${rows.length} kazanç kaydı işlendi</p>
      </div>
    </div>
    <p style="margin: 0; color: #4b5563;">Kazancınız cüzdanınıza yansımıştır. Mağazadan dilediğiniz ürünleri satın alabilirsiniz.</p>
  </div>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">Bu bildirim otomatik sistem protokolleri tarafından oluşturulmuştur.</div>
</div>`,
        category: 'system',
        status: 'published',
        author_name: 'Sistem',
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
              serverId: server.id,
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
