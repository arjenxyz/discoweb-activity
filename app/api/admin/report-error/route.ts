import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';

const REPORTABLE_STATUSES = new Set([
  'discord_api_error',
  'missing_service_role',
  'missing_bot_token',
  'server_not_registered',
  'server_setup_required',
]);

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_ERROR_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  let body: { status?: string; guildId?: string; guildName?: string; debug?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.status || !REPORTABLE_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'not_reportable' }, { status: 400 });
  }

  const embed = {
    title: '⚠️ Activity Hata Bildirimi',
    color: 0xff4444,
    fields: [
      { name: 'Hata Kodu', value: `\`${body.status}\``, inline: true },
      { name: 'Sunucu', value: body.guildName ?? body.guildId ?? 'Bilinmiyor', inline: true },
      { name: 'Sunucu ID', value: body.guildId ?? 'Bilinmiyor', inline: true },
      { name: 'Kullanıcı ID', value: session.userId, inline: true },
      ...(body.debug ? [{ name: 'Debug', value: `\`\`\`json\n${JSON.stringify(body.debug, null, 2)}\n\`\`\`` }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Activity Hata Sistemi' },
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'webhook_failed', status: res.status }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
