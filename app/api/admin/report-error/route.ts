import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { logError } from '@/lib/serverLogger';

const REPORTABLE_STATUSES = new Set([
  'discord_api_error',
  'missing_service_role',
  'missing_bot_token',
  'server_not_registered',
  'server_setup_required',
]);

const STATUS_DESCRIPTIONS: Record<string, string> = {
  discord_api_error: 'Discord API geçici hata verdi — retry sonrası da başarısız.',
  missing_service_role: 'SUPABASE_SERVICE_ROLE_KEY env değişkeni eksik veya hatalı.',
  missing_bot_token: 'DISCORD_BOT_TOKEN env değişkeni eksik.',
  server_not_registered: "Guild Supabase'de kayıtlı değil.",
  server_setup_required: 'Guild kayıtlı ama kurulum tamamlanmamış (is_setup=false).',
};

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_ERROR_WEBHOOK_URL;

  let body: { status?: string; guildId?: string; guildName?: string; debug?: unknown; userAgent?: string; timestamp?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.status || !REPORTABLE_STATUSES.has(body.status)) {
    return NextResponse.json({ error: 'not_reportable' }, { status: 400 });
  }

  // Webhook yoksa doğrudan bot kanalına gönder
  if (!webhookUrl) {
    await logError(new Error(`[Kullanıcı Bildirimi] ${body.status}`), {
      route: 'report-error',
      userId: session.userId,
      guildId: body.guildId,
      extra: { status: body.status, guildName: body.guildName, debug: body.debug },
    });
    return NextResponse.json({ ok: true });
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'Bilinmiyor';
  const serverUserAgent = request.headers.get('user-agent') ?? 'Bilinmiyor';

  const embed = {
    title: '⚠️ Activity Hata Bildirimi',
    color: 0xff4444,
    fields: [
      { name: 'Hata Kodu', value: `\`${body.status}\``, inline: true },
      { name: 'Sunucu', value: body.guildName ?? body.guildId ?? 'Bilinmiyor', inline: true },
      { name: 'Sunucu ID', value: body.guildId ?? 'Bilinmiyor', inline: true },
      { name: 'Kullanıcı ID', value: session.userId, inline: true },
      { name: 'IP', value: ip, inline: true },
      { name: 'İstemci Zamanı', value: body.timestamp ?? 'Bilinmiyor', inline: true },
      { name: 'Hata Açıklaması', value: STATUS_DESCRIPTIONS[body.status] ?? 'Bilinmiyor', inline: false },
      { name: 'User Agent', value: `\`${body.userAgent ?? serverUserAgent}\``, inline: false },
      ...(body.url ? [{ name: 'URL', value: body.url, inline: false }] : []),
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
