import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';

const SUPPORT_CHANNEL_ID = '1486998714823475221';

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
  let imageBase64: string | null = null;
  let imageMime = 'image/png';
  let sessionInfo: Record<string, unknown> = {};
  let errorLog: unknown[] = [];

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      description = (form.get('description') as string) ?? '';
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
      sessionInfo = body.sessionInfo ?? {};
      errorLog = body.errorLog ?? [];
    }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!description.trim()) {
    return NextResponse.json({ error: 'empty_description' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'Bilinmiyor';

  const embed = {
    title: '🐛 Hata Bildirimi',
    color: 0xED4245,
    description: description.slice(0, 2000),
    fields: [
      { name: 'Kullanıcı', value: `<@${session.userId}>`, inline: true },
      { name: 'IP', value: ip, inline: true },
      { name: 'Zaman', value: new Date().toISOString(), inline: true },
      ...(sessionInfo.url ? [{ name: 'URL', value: String(sessionInfo.url), inline: false }] : []),
      ...(sessionInfo.userAgent ? [{ name: 'User Agent', value: `\`${String(sessionInfo.userAgent).slice(0, 200)}\``, inline: false }] : []),
      ...(sessionInfo.screenSize ? [{ name: 'Ekran', value: String(sessionInfo.screenSize), inline: true }] : []),
      ...(sessionInfo.guildId ? [{ name: 'Guild', value: String(sessionInfo.guildId), inline: true }] : []),
      ...(errorLog.length > 0 ? [{
        name: `Son Hatalar (${errorLog.length})`,
        value: '```json\n' + JSON.stringify(errorLog.slice(-3), null, 2).slice(0, 900) + '\n```',
        inline: false,
      }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'DiscoWeb Destek Sistemi' },
  };

  if (!imageBase64) {
    // Sadece embed gönder
    const res = await fetch(`https://discord.com/api/v10/channels/${SUPPORT_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Discord mesaj hatası:', err);
      return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
    }
  } else {
    // Embed + görsel birlikte gönder (multipart)
    const ext = imageMime.split('/')[1] ?? 'png';
    const filename = `screenshot.${ext}`;
    const imgBuf = Buffer.from(imageBase64, 'base64');

    const payload = {
      embeds: [{ ...embed, image: { url: `attachment://${filename}` } }],
    };

    const fd = new FormData();
    fd.append('payload_json', JSON.stringify(payload));
    fd.append('files[0]', new Blob([imgBuf], { type: imageMime }), filename);

    const res = await fetch(`https://discord.com/api/v10/channels/${SUPPORT_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}` },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Discord mesaj hatası:', err);
      return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
