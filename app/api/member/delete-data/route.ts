import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const deleteForUser = async (
  supabase: SupabaseClient,
  userId: string,
  scope: 'current' | 'all',
  guildId: string | null,
) => {
  // user_id + guild_id olan tablolar — current scope'da guild bazlı, all scope'da tümü silinir
  const perGuildTables = [
    'member_wallets',
    'wallet_ledger',
    'member_overview_stats',
    'member_daily_stats',
    'member_profiles',
    'raffle_entries',
    'activity_participation',
    'voice_participation',
    'daily_earnings',
    'user_guilds',
    'system_mails',
    'store_orders',        // guild_id eklendi (migration 20260322000003)
    'discount_usages',     // guild_id eklendi (migration 20260322000003)
    'promotion_usages',    // guild_id eklendi (migration 20260322000003)
    'notification_reads',  // guild_id eklendi (migration 20260322000003)
  ];

  // Sadece user_id olan tablolar — yalnızca all scope'da silinir
  const globalTables = [
    'referral_milestone_claims',
    'referral_history',
    'system_mail_reads',
    'system_mail_stars',
  ];

  for (const table of perGuildTables) {
    if (scope === 'current' && guildId) {
      await supabase.from(table).delete().match({ user_id: userId, guild_id: guildId });
    } else {
      await supabase.from(table).delete().match({ user_id: userId });
    }
  }

  if (scope === 'all') {
    for (const table of globalTables) {
      await supabase.from(table).delete().match({ user_id: userId });
    }
  }
};

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }

  const userId = session.userId;

  const selectedGuildId = await getSelectedGuildId(request);

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json({ error: 'maintenance' }, { status: 503 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({ scope: 'current' }));
  const scope = body?.scope === 'all' ? 'all' : 'current';

  if (scope === 'current' && !selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });
  }

  try {
    await deleteForUser(supabase, userId, scope, selectedGuildId);

    if (scope === 'all') {
      // Discord OAuth2 token'ı revoke et
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;

      if (clientId && clientSecret) {
        const { data: userRow } = await supabase
          .from('users')
          .select('oauth_access_token')
          .eq('discord_id', userId)
          .maybeSingle();

        if (userRow?.oauth_access_token) {
          await fetch('https://discord.com/api/oauth2/token/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              token: userRow.oauth_access_token,
            }),
          }).catch(() => {}); // revoke başarısız olsa da devam et
        }
      }

      // users tablosundaki kaydı sil
      await supabase.from('users').delete().eq('discord_id', userId);
    }

    // --- Developer Notification Log ---
    const devLogChannelId = '1507388387764736102';
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken) {
      const scopeText = scope === 'all' ? 'TÜM VERİLERİNİ (Global)' : 'Mevcut Sunucu Verilerini';
      await fetch(`https://discord.com/api/v10/channels/${devLogChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [
            {
              title: '🗑️ Yasal Veri Silme İşlemi (GDPR/KVKK)',
              color: 15548997,
              description: `Bir kullanıcı **${scopeText}** sistemden kalıcı olarak sildi.`,
              fields: [
                { name: 'Kullanıcı ID', value: `\`${userId}\``, inline: true },
                { name: 'Sunucu ID', value: `\`${selectedGuildId || 'Bilinmiyor'}\``, inline: true },
                { name: 'Kapsam', value: `\`${scope}\``, inline: true },
                { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
              ],
              footer: { text: 'DiscoWeb Security & Compliance Log' }
            }
          ]
        })
      }).catch(err => console.error('Failed to send dev log:', err));
    }

    return NextResponse.json({ status: 'ok', scope, guildId: selectedGuildId });
  } catch (err) {
    console.error('delete-data error', err);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
