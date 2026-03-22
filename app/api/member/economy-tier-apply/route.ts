import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isGuildAdmin } from '@/lib/adminAuth';
import { checkGlobalFreeze } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

const DEV_CHANNEL_ID = process.env.ECONOMY_REVIEW_CHANNEL_ID ?? process.env.ERROR_LOG_CHANNEL_ID ?? '';

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

  // Sadece sunucu yöneticileri başvurabilir
  const admin = await isGuildAdmin(userId, guildId);
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Sunucu bilgisini çek
  const { data: server } = await supabase
    .from('servers')
    .select('id, name, economy_tier')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  if (server.economy_tier === 'advanced') {
    return NextResponse.json({ error: 'already_advanced' }, { status: 400 });
  }

  // Bekleyen başvuru var mı?
  const { data: existing } = await supabase
    .from('economy_tier_applications')
    .select('id, status')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'pending_application_exists' }, { status: 400 });
  }

  const body = (await request.json()) as { starter_package?: number };
  const starterPackage = Number(body.starter_package ?? 0);
  if (!Number.isFinite(starterPackage) || starterPackage < 0) {
    return NextResponse.json({ error: 'invalid_starter_package' }, { status: 400 });
  }

  // Başvuruyu kaydet
  const { data: application, error: insertError } = await supabase
    .from('economy_tier_applications')
    .insert({
      guild_id: guildId,
      applicant_user_id: userId,
      status: 'pending',
      starter_package: starterPackage,
    })
    .select('id')
    .single();

  if (insertError || !application) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // Developer Discord kanalına butonlu embed gönder
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (botToken && DEV_CHANNEL_ID) {
    try {
      await fetch(`https://discord.com/api/channels/${DEV_CHANNEL_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🔵 Yüksek Ekonomi Başvurusu',
            color: 0x5865F2,
            fields: [
              { name: 'Sunucu', value: server.name ?? guildId, inline: true },
              { name: 'Guild ID', value: guildId, inline: true },
              { name: 'Başvuran', value: `<@${userId}>`, inline: true },
              { name: 'Başlangıç Hazine Paketi', value: `**${starterPackage.toLocaleString('tr-TR')} Papel**`, inline: true },
              { name: 'Başvuru ID', value: `\`${application.id}\``, inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'DiscoWeb Ekonomi Sistemi' },
          }],
          components: [{
            type: 1,
            components: [
              {
                type: 2,
                style: 3, // Success (yeşil)
                label: '✅ Onayla',
                custom_id: `economy_approve_${application.id}`,
              },
              {
                type: 2,
                style: 4, // Danger (kırmızı)
                label: '❌ Reddet',
                custom_id: `economy_reject_${application.id}`,
              },
            ],
          }],
        }),
      });
    } catch (e) {
      console.error('Economy review embed failed:', e);
      // Embed hatası başvuruyu durdurmaz
    }
  }

  return NextResponse.json({ ok: true, applicationId: application.id });
}
