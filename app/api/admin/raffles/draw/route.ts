import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isGuildAdmin } from '@/lib/adminAuth';
import { discordFetch } from '@/lib/discordRest';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

/** Fisher-Yates tarafsız karıştırma */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function papelWinnerMail(opts: { username: string; raffleTitle: string; amount: number; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">🏆</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:28px;font-weight:700;color:#f59e0b;margin:0">${opts.amount.toLocaleString('tr-TR')} Papel</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Papel bakiyenize otomatik olarak eklenmiştir.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

function roleWinnerMail(opts: { username: string; raffleTitle: string; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">🎖️</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:20px;font-weight:700;color:#a78bfa;margin:0">🛡️ Özel Discord Rolü</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Kazandığınız rol Discord sunucusunda hesabınıza atanmıştır. Herhangi bir sorun yaşarsanız bir yönetici ile iletişime geçin.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

function multiplierWinnerMail(opts: { username: string; raffleTitle: string; value: number; days: number; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">⚡</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:28px;font-weight:700;color:#34d399;margin:0">×${opts.value} Kazanç Çarpanı</p>
    <p style="color:#64748b;font-size:13px;margin:8px 0 0">${opts.days} gün geçerli</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Çarpan otomatik olarak hesabınıza uygulanmıştır.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

function mariWinnerMail(opts: { username: string; raffleTitle: string; amount: number; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">💎</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:28px;font-weight:700;color:#818cf8;margin:0">${opts.amount.toFixed(4)} Mari</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Mari bakiyenize otomatik olarak eklenmiştir.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

function lotWinnerMail(opts: { username: string; raffleTitle: string; count: number; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">📈</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:28px;font-weight:700;color:#f59e0b;margin:0">${opts.count.toLocaleString('tr-TR')} Lot</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Lotlar portföyünüze otomatik olarak eklenmiştir.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

function customWinnerMail(opts: { username: string; raffleTitle: string; prizes: string[]; drawDate: string }): string {
  return `<div style="font-family:sans-serif;color:#e2e8f0;max-width:600px;margin:0 auto;padding:24px;background:#0b0d12;border-radius:16px;border:1px solid #1e2232">
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px">🎁</div>
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:8px 0">Tebrikler, ${opts.username}!</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0">"${opts.raffleTitle}" çekilişinde kazandınız.</p>
  </div>
  <div style="background:#1e2232;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
    <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px 0">Kazanılan Ödül</p>
    <p style="font-size:18px;font-weight:700;color:#60a5fa;margin:0">${opts.prizes.join(' · ')}</p>
  </div>
  <p style="color:#64748b;font-size:13px;text-align:center;margin:0">Ödülünüzü teslim almak için bir yönetici ile iletişime geçiniz. Discord üzerinde etiketleneceksiniz.</p>
  <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0">Çekiliş tarihi: ${opts.drawDate} — DiscoWeb Sistemi</p>
</div>`;
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'missing_guild' }, { status: 400 });

  if (!(await isGuildAdmin(session.userId, guildId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { raffleId } = (await request.json()) as { raffleId?: string };
  if (!raffleId) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { data: raffle, error: raffleError } = await supabase
    .from('raffles')
    .select('*')
    .eq('id', raffleId)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (raffleError || !raffle) return NextResponse.json({ error: 'raffle_not_found' }, { status: 404 });
  if (raffle.drawn_at) return NextResponse.json({ error: 'already_drawn' }, { status: 400 });

  const { data: entries, error: entriesError } = await supabase
    .from('raffle_entries')
    .select('id, user_id')
    .eq('raffle_id', raffleId);

  if (entriesError) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  if (!entries?.length) return NextResponse.json({ error: 'no_entries' }, { status: 400 });

  const winnerCount = Math.min(raffle.winner_count ?? 1, entries.length);
  const shuffled = shuffle(entries);
  const winners = shuffled.slice(0, winnerCount);
  const winnerUserIds = winners.map((w: { user_id: string }) => w.user_id);

  const drawnAt = new Date().toISOString();
  const drawDateLabel = new Date(drawnAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  await supabase
    .from('raffle_entries')
    .update({ is_winner: true })
    .in('user_id', winnerUserIds)
    .eq('raffle_id', raffleId);

  await supabase
    .from('raffles')
    .update({ drawn_at: drawnAt, is_active: false })
    .eq('id', raffleId);

  const { data: membersData } = await supabase
    .from('members')
    .select('user_id, username, avatar_url')
    .in('user_id', winnerUserIds);

  const memberMap: Record<string, { username: string }> = {};
  for (const m of membersData ?? []) {
    memberMap[m.user_id] = { username: m.username };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const rewardErrors: string[] = [];

  // Server ID for wallet operations
  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .maybeSingle();

  for (const winner of winners) {
    const username = memberMap[winner.user_id]?.username ?? winner.user_id;

    try {
      if (raffle.prize_type === 'papel' && raffle.prize_papel_amount && server) {
        // Papel ödülü: wallet balance artır
        const { data: wallet } = await supabase
          .from('member_wallets')
          .select('balance')
          .eq('user_id', winner.user_id)
          .eq('server_id', server.id)
          .maybeSingle();

        const newBalance = (Number(wallet?.balance ?? 0)) + Number(raffle.prize_papel_amount);
        await supabase
          .from('member_wallets')
          .upsert(
            { user_id: winner.user_id, server_id: server.id, guild_id: guildId, balance: newBalance },
            { onConflict: 'user_id,server_id' },
          );

        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `🏆 Çekiliş Kazandınız! — ${raffle.title}`,
          body: papelWinnerMail({ username, raffleTitle: raffle.title, amount: raffle.prize_papel_amount, drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      } else if (raffle.prize_type === 'role' && raffle.prize_role_id) {
        if (botToken) {
          const res = await discordFetch(
            `https://discord.com/api/guilds/${guildId}/members/${winner.user_id}/roles/${raffle.prize_role_id}`,
            { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } },
            { retries: 2 },
          );
          if (!res.ok && res.status !== 204) {
            rewardErrors.push(`role_assign_failed:${winner.user_id}`);
          }
        }

        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `🎖️ Çekiliş Kazandınız! — ${raffle.title}`,
          body: roleWinnerMail({ username, raffleTitle: raffle.title, drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      } else if (raffle.prize_type === 'timed_multiplier' && raffle.prize_multiplier_value && raffle.prize_multiplier_days) {
        const expiresAt = new Date(Date.now() + raffle.prize_multiplier_days * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('member_active_multipliers').insert({
          user_id: winner.user_id,
          guild_id: guildId,
          multiplier_value: raffle.prize_multiplier_value,
          source: 'raffle',
          source_id: raffleId,
          expires_at: expiresAt,
        });
        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `⚡ Çekiliş Kazandınız! — ${raffle.title}`,
          body: multiplierWinnerMail({ username, raffleTitle: raffle.title, value: raffle.prize_multiplier_value, days: raffle.prize_multiplier_days, drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      } else if (raffle.prize_type === 'mari' && raffle.prize_mari_amount) {
        // Deduct from server_mari_treasury and credit to member wallet
        const mariAmount = Number(raffle.prize_mari_amount);
        await supabase.rpc('deduct_mari_treasury', { p_guild_id: guildId, p_amount: mariAmount }).maybeSingle().catch(() => {});
        const { data: walletRow } = await supabase
          .from('member_wallets')
          .select('mari_balance')
          .eq('guild_id', guildId)
          .eq('user_id', winner.user_id)
          .maybeSingle();
        const newMariBalance = Number((Number((walletRow as any)?.mari_balance ?? 0) + mariAmount).toFixed(6));
        await (supabase.from('member_wallets') as any).upsert(
          { guild_id: guildId, user_id: winner.user_id, mari_balance: newMariBalance, updated_at: drawnAt },
          { onConflict: 'guild_id,user_id' },
        );
        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `💎 Çekiliş Kazandınız! — ${raffle.title}`,
          body: mariWinnerMail({ username, raffleTitle: raffle.title, amount: mariAmount, drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      } else if (raffle.prize_type === 'lot' && raffle.prize_lot_count) {
        // Deduct from treasury_holdings and credit to investor_holdings
        const lotCount = Number(raffle.prize_lot_count);
        await supabase
          .from('treasury_holdings')
          .update({ lot_count: supabase.rpc as any })
          .eq('guild_id', guildId)
          .maybeSingle()
          .catch(() => {});
        // Directly update treasury_holdings lot_count
        const { data: treasuryRow } = await supabase
          .from('treasury_holdings')
          .select('lot_count')
          .eq('guild_id', guildId)
          .maybeSingle();
        if (treasuryRow && treasuryRow.lot_count >= lotCount) {
          await supabase
            .from('treasury_holdings')
            .update({ lot_count: treasuryRow.lot_count - lotCount, last_updated: drawnAt })
            .eq('guild_id', guildId);
        }
        // Credit lots to winner
        const { data: holdingRow } = await supabase
          .from('investor_holdings')
          .select('id,lot_count')
          .eq('guild_id', guildId)
          .eq('user_id', winner.user_id)
          .maybeSingle();
        if (holdingRow) {
          await supabase
            .from('investor_holdings')
            .update({ lot_count: holdingRow.lot_count + lotCount })
            .eq('id', holdingRow.id);
        } else {
          await supabase.from('investor_holdings').insert({
            guild_id: guildId, user_id: winner.user_id, lot_count: lotCount, avg_buy_price: 0,
          });
        }
        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `📈 Çekiliş Kazandınız! — ${raffle.title}`,
          body: lotWinnerMail({ username, raffleTitle: raffle.title, count: lotCount, drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      } else {
        await supabase.from('system_mails').insert({
          guild_id: guildId,
          user_id: winner.user_id,
          title: `🎁 Çekiliş Kazandınız! — ${raffle.title}`,
          body: customWinnerMail({ username, raffleTitle: raffle.title, prizes: raffle.prizes ?? ['Özel Ödül'], drawDate: drawDateLabel }),
          category: 'lottery',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: drawnAt,
        });
      }

      await supabase
        .from('raffle_entries')
        .update({ reward_sent_at: drawnAt })
        .eq('raffle_id', raffleId)
        .eq('user_id', winner.user_id);

    } catch (err) {
      rewardErrors.push(`${winner.user_id}: ${String(err).slice(0, 100)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    winnerCount,
    winnerUserIds,
    rewardErrors: rewardErrors.length > 0 ? rewardErrors : undefined,
  });
}
