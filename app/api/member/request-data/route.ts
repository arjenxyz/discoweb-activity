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

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'discord_bot_not_configured' }, { status: 500 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  try {
    // 1. Fetch User Data
    const { data: profile } = await supabase.from('member_profiles').select('*').eq('user_id', userId).eq('guild_id', selectedGuildId).maybeSingle();
    const { data: wallets } = await supabase.from('member_wallets').select('*').eq('user_id', userId);
    const { data: serverRecords } = await supabase.from('user_guilds').select('*').eq('user_id', userId);
    
    // Construct Personal Data Dump
    const personalData = {
      generatedAt: new Date().toISOString(),
      requestedBy: userId,
      serverContext: selectedGuildId,
      profile: profile || {},
      wallets: wallets || [],
      joinedServers: serverRecords || [],
      notice: "This data dump is provided automatically. By holding this file, you assume full responsibility for its security."
    };

    const jsonString = JSON.stringify(personalData, null, 2);

    // 2. Open DM Channel with User
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: userId }),
    });

    const dmData = await dmRes.json();
    if (!dmRes.ok || !dmData.id) {
      console.error('Failed to open DM channel:', dmData);
      return NextResponse.json({ error: 'dm_closed' }, { status: 403 });
    }

    // 3. Send Message with File
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({
      content: "🛡️ **Kişisel Veri Talebiniz (GDPR/KVKK)**\n\nMerhaba! DiscoWeb üzerinden talep ettiğiniz hesap verileriniz ektedir. \n\n⚠️ **Sorumluluk Reddi:** *Bu dosyayı cihazınıza indirdiğiniz andan itibaren verilerinizin güvenliği tamamen size aittir. Dosyayı üçüncü şahıslarla paylaşırsanız oluşabilecek sorunlardan platformumuz sorumlu değildir.*",
    }));

    const fileBlob = new Blob([jsonString], { type: 'application/json' });
    formData.append('files[0]', fileBlob, 'discoweb_personal_data.json');

    const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmData.id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      body: formData,
    });

    const msgData = await msgRes.json();
    if (!msgRes.ok) {
      console.error('Failed to send DM message:', msgData);
      return NextResponse.json({ error: 'dm_send_failed' }, { status: 500 });
    }

    // --- Developer Notification Log ---
    const devLogChannelId = '1507387534546571404'; // Developer defined log channel
    if (botToken) {
      await fetch(`https://discord.com/api/v10/channels/${devLogChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [
            {
              title: '⚖️ Yasal Veri Talebi (GDPR/KVKK)',
              color: 16753920,
              description: 'Bir kullanıcı **Kişisel Veri İndirme** işlemini başarıyla gerçekleştirdi ve veri paketi kendisine DM yoluyla teslim edildi.',
              fields: [
                { name: 'Kullanıcı ID', value: `\`${userId}\``, inline: true },
                { name: 'Sunucu ID', value: `\`${selectedGuildId || 'Bilinmiyor'}\``, inline: true },
                { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
              ],
              footer: { text: 'DiscoWeb Security & Compliance Log' }
            }
          ]
        })
      }).catch(err => console.error('Failed to send dev log:', err));
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('request-data error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
