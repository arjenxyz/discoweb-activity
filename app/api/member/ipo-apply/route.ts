import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isGuildAdmin } from '@/lib/adminAuth';
import { checkGlobalFreeze } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

const IPO_REVIEW_CHANNEL_ID = process.env.IPO_REVIEW_CHANNEL_ID ?? process.env.ECONOMY_REVIEW_CHANNEL_ID ?? '';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  const freeze = await checkGlobalFreeze();
  if (freeze.frozen || freeze.readOnly) {
    return NextResponse.json({ error: 'global_freeze' }, { status: 503 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  // Admin kontrolü
  const adminCheck = await isGuildAdmin(userId, guildId);
  if (!adminCheck) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await request.json()) as {
    proposed_price?: number;
    proposed_founder_ratio?: number; // 0.51 – 0.80
  };

  const { proposed_price, proposed_founder_ratio } = body;

  if (!proposed_price || proposed_price <= 0) {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }
  if (!proposed_founder_ratio || proposed_founder_ratio < 0.51 || proposed_founder_ratio > 0.80) {
    return NextResponse.json({ error: 'invalid_founder_ratio' }, { status: 400 });
  }

  // Sunucu Yüksek Ekonomi'de mi?
  const { data: server } = await supabase
    .from('servers')
    .select('economy_tier, discord_name, member_count')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  if (server.economy_tier !== 'advanced') {
    return NextResponse.json({ error: 'not_advanced' }, { status: 400 });
  }

  // Zaten listede mi?
  const { data: existingListing } = await supabase
    .from('server_listings')
    .select('id, status')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (existingListing) {
    return NextResponse.json({ error: 'already_listed', status: existingListing.status }, { status: 400 });
  }

  // Bekleyen başvuru var mı?
  const { data: existingApp } = await supabase
    .from('ipo_applications')
    .select('id, status')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingApp) {
    return NextResponse.json({ error: 'pending_exists' }, { status: 400 });
  }

  // Sunucu ekonomi istatistikleri snapshot
  const { data: treasury } = await supabase
    .from('server_treasury')
    .select('balance, total_collected, total_burned')
    .eq('guild_id', guildId)
    .maybeSingle();

  const { count: memberCount } = await supabase
    .from('member_wallets')
    .select('*', { count: 'exact', head: true })
    .eq('guild_id', guildId);

  const guildStatsSnapshot = {
    server_name: server.discord_name,
    member_count: memberCount ?? 0,
    treasury_balance: treasury?.balance ?? 0,
    total_collected: treasury?.total_collected ?? 0,
    total_burned: treasury?.total_burned ?? 0,
    snapshot_at: new Date().toISOString(),
  };

  // Başvuruyu kaydet
  const { data: application, error } = await supabase
    .from('ipo_applications')
    .insert({
      guild_id: guildId,
      applicant_user_id: userId,
      proposed_price,
      proposed_founder_ratio,
      guild_stats_snapshot: guildStatsSnapshot,
    })
    .select('id')
    .single();

  if (error || !application) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // Discord bot kanalına embed gönder
  if (BOT_TOKEN && IPO_REVIEW_CHANNEL_ID) {
    const founderPct = Math.round(proposed_founder_ratio * 100);
    const founderLots = Math.round(1_000_000 * proposed_founder_ratio);
    const publicLots = 1_000_000 - founderLots;

    const embed = {
      title: '📈 Yeni IPO Başvurusu',
      color: 0x5865F2,
      fields: [
        { name: 'Sunucu', value: `${server.discord_name} (\`${guildId}\`)`, inline: true },
        { name: 'Başvuran', value: `<@${userId}>`, inline: true },
        { name: 'Önerilen Fiyat', value: `${proposed_price.toLocaleString()} Papel/lot`, inline: true },
        { name: 'Founder Oranı', value: `%${founderPct} (${founderLots.toLocaleString()} lot)`, inline: true },
        { name: 'Halka Açık', value: `${publicLots.toLocaleString()} lot`, inline: true },
        { name: 'Hazine', value: `${(treasury?.balance ?? 0).toLocaleString()} Papel`, inline: true },
        { name: 'Üye Sayısı', value: `${memberCount ?? 0}`, inline: true },
      ],
      footer: { text: `Başvuru ID: ${application.id}` },
      timestamp: new Date().toISOString(),
    };

    const components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: '✅ Onayla',
            custom_id: `ipo_approve_${application.id}`,
          },
          {
            type: 2,
            style: 4,
            label: '❌ Reddet',
            custom_id: `ipo_reject_${application.id}`,
          },
        ],
      },
    ];

    await fetch(`https://discord.com/api/v10/channels/${IPO_REVIEW_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed], components }),
    });
  }

  return NextResponse.json({ ok: true, application_id: application.id });
}
