import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const BUG_CHANNEL_ID        = '1487028411938373733';
const SUGGESTION_CHANNEL_ID = '1487028139438903296';

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'bot_not_configured' }, { status: 500 });
  }

  let description = '';
  let section = '';
  let type = 'bug'; // 'bug' | 'suggestion'
  let imageBase64: string | null = null;
  let imageMime = 'image/png';
  let sessionInfo: Record<string, unknown> = {};
  let errorLog: unknown[] = [];

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      description = (form.get('description') as string) ?? '';
      section = (form.get('section') as string) ?? '';
      type = (form.get('type') as string) || 'bug';
      const raw = form.get('sessionInfo');
      if (raw) sessionInfo = JSON.parse(raw as string);
      const rawLog = form.get('errorLog');
      if (rawLog) errorLog = JSON.parse(rawLog as string);

      const file = form.get('image') as File | null;
      if (file && file.size > 0) {
        imageMime = file.type || 'image/png';
        const buf = await file.arrayBuffer();
        imageBase64 = Buffer.from(buf).toString('base64');
      }
    } else {
      const body = await request.json();
      description = body.description ?? '';
      section = body.section ?? '';
      type = body.type || 'bug';
      sessionInfo = body.sessionInfo ?? {};
      errorLog = body.errorLog ?? [];
    }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!description.trim()) {
    return NextResponse.json({ error: 'empty_description' }, { status: 400 });
  }

  const channelId = type === 'suggestion' ? SUGGESTION_CHANNEL_ID : BUG_CHANNEL_ID;
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'Bilinmiyor';

  // Insert report into DB first to get the ID
  const supabase = getSupabase();
  let reportId: string | null = null;
  if (supabase) {
    const { data } = await supabase
      .from('bug_reports')
      .insert({ user_id: session.userId, section, type, description, status: 'pending', channel_id: channelId })
      .select('id')
      .single();
    reportId = data?.id ?? null;
  }

  const s = sessionInfo;
  const str = (v: unknown) => v != null ? String(v) : null;
  const field = (name: string, value: unknown, inline = true) =>
    str(value) ? { name, value: str(value)!, inline } : null;

  const fields = [
    // Kim
    { name: '👤 Kullanıcı', value: `<@${session.userId}>`, inline: true },
    field('🌐 IP', ip),
    field('⏰ Zaman', new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })),

    // Sayfa
    s.url ? { name: '🔗 URL', value: String(s.url).slice(0, 500), inline: false } : null,
    field('🗺️ Timezone', s.timezone),
    field('🌍 Locale', s.locale),
    field('🌐 Online', s.online != null ? (s.online ? 'Evet' : 'Hayır') : null),

    // Discord session
    field('🎮 Guild ID', s.guildId),
    field('🖼️ Frame ID', s.frameId),
    field('📋 Instance ID', s.instanceId),
    field('🔑 Auth Yöntemi', s.authMethod),
    field('🎨 Tema', s.theme),

    // Ekran & viewport
    field('🖥️ Ekran', s.screenSize),
    field('📐 Viewport', s.viewport),
    field('🔍 DPR', s.devicePixelRatio),
    field('🎨 Renk Derinliği', s.colorDepth ? `${s.colorDepth}-bit` : null),

    // Ağ
    field('📶 Bağlantı', s.connectionType),
    field('⬇️ Downlink', s.downlink),
    field('📡 RTT', s.rtt),

    // Performans
    field('⚡ Sayfa Yükleme', s.pageLoadMs != null ? `${s.pageLoadMs}ms` : null),
    field('🏃 DOM Interactive', s.domInteractiveMs != null ? `${s.domInteractiveMs}ms` : null),
    field('🧠 Bellek', s.memoryMB),

    // Tarayıcı
    s.userAgent ? { name: '🌐 User Agent', value: `\`${String(s.userAgent).slice(0, 200)}\``, inline: false } : null,
    field('💻 Platform', s.platform),
    field('🍪 Cookie', s.cookiesEnabled != null ? (s.cookiesEnabled ? 'Açık' : 'Kapalı') : null),

    // Hata logları
    errorLog.length > 0 ? {
      name: `🪲 Son Hatalar (${errorLog.length} adet)`,
      value: '```json\n' + JSON.stringify(errorLog.slice(-5), null, 2).slice(0, 1000) + '\n```',
      inline: false,
    } : { name: '🪲 Hata Logu', value: '`Kayıtlı hata yok`', inline: true },

  ].filter(Boolean) as { name: string; value: string; inline: boolean }[];

  const sectionLabel = section ? ` [${section}]` : '';
  const isSuggestion = type === 'suggestion';
  const embed = {
    title: isSuggestion ? `💡 Öneri${sectionLabel}` : `🐛 Hata Bildirimi${sectionLabel}`,
    color: isSuggestion ? 0x5865F2 : 0xED4245,
    description: description.slice(0, 2000),
    fields: fields.slice(0, 25),
    timestamp: new Date().toISOString(),
    footer: { text: `DiscoWeb Destek · User: ${session.userId}${reportId ? ` · ID: ${reportId.slice(0, 8)}` : ''}` },
  };

  // Select menu — only if we have a reportId to reference
  const bugOptions = [
    { label: '🔍 İnceleniyor',         value: 'reviewing',     description: 'Ekip incelemeye aldı' },
    { label: '💬 Bilgi Gerekiyor',      value: 'need_info',     description: 'Daha fazla bilgi isteniyor' },
    { label: '⚠️ Kritik',              value: 'critical',      description: 'Öncelikli ele alınacak' },
    { label: '🔧 Deploy Bekleniyor',    value: 'fixed_pending', description: 'Düzeltildi, yayınlanacak' },
    { label: '✅ Çözüldü',              value: 'resolved',      description: 'Sorun giderildi' },
    { label: '❌ Tespit Edilemedi',     value: 'not_found',     description: 'Üretilemedi' },
    { label: '🔁 Bilinen Sorun',        value: 'duplicate',     description: 'Zaten takip ediliyor' },
    { label: '🚫 Geçersiz',             value: 'invalid',       description: 'Alakasız veya spam' },
  ];

  const suggestionOptions = [
    { label: '🔍 İnceleniyor',          value: 'reviewing',     description: 'Ekip değerlendiriyor' },
    { label: '💬 Detay Gerekiyor',      value: 'need_info',     description: 'Daha fazla açıklama isteniyor' },
    { label: '🎯 Sonraki Sürüme Alındı',value: 'planned_next',  description: 'Yakında eklenecek' },
    { label: '⏳ Uzun Vadeli',          value: 'long_term',     description: 'Uzun vadede düşünülüyor' },
    { label: '✅ Kabul Edildi',          value: 'resolved',      description: 'Eklenecek' },
    { label: '❌ Reddedildi',           value: 'not_found',     description: 'Şimdilik planlanmıyor' },
    { label: '🔁 Zaten Mevcut',         value: 'duplicate',     description: 'Bu özellik zaten var' },
    { label: '🚫 Kapsam Dışı',          value: 'invalid',       description: 'Projenin odağıyla uyuşmuyor' },
  ];

  const selectCustomId = isSuggestion ? `suggestion_select_${reportId}` : `bugreport_select_${reportId}`;
  const selectOptions  = isSuggestion ? suggestionOptions : bugOptions;

  const components = reportId ? [{
    type: 1,
    components: [{
      type: 3,
      custom_id: selectCustomId,
      placeholder: '⚙️ Durumu güncelle...',
      options: selectOptions,
    }],
  }] : [];

  let messageId: string | null = null;

  if (!imageBase64) {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed], components }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Discord mesaj hatası:', err);
      return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
    }
    const msg = await res.json() as { id?: string };
    messageId = msg.id ?? null;
  } else {
    const ext = imageMime.split('/')[1] ?? 'png';
    const filename = `screenshot.${ext}`;
    const imgBuf = Buffer.from(imageBase64, 'base64');

    const payload = {
      embeds: [{ ...embed, image: { url: `attachment://${filename}` } }],
      components,
    };

    const fd = new FormData();
    fd.append('payload_json', JSON.stringify(payload));
    fd.append('files[0]', new Blob([imgBuf], { type: imageMime }), filename);

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}` },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Discord mesaj hatası:', err);
      return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
    }
    const msg = await res.json() as { id?: string };
    messageId = msg.id ?? null;
  }

  // Store the Discord message ID so the bot can edit it later
  if (supabase && reportId && messageId) {
    await supabase.from('bug_reports').update({ message_id: messageId }).eq('id', reportId);
  }

  return NextResponse.json({ ok: true, reportId });
}
