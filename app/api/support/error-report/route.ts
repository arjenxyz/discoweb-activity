import { NextResponse } from 'next/server';

const CHANNEL_ID = '1484523061209202820';

const ipLog = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const win = 5 * 60 * 1000;
  const hits = (ipLog.get(ip) ?? []).filter(t => now - t < win);
  if (hits.length >= 5) return true;
  hits.push(now);
  ipLog.set(ip, hits);
  return false;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ error: 'bot_not_configured' }, { status: 500 });

  let body: {
    errorCode?: string;
    message?: string;
    stack?: string;
    url?: string;
    userAgent?: string;
    debugLogs?: string[];
    context?: string;
    componentStack?: string;
    breadcrumbs?: string[];
    section?: string;
    deviceInfo?: string;
  };

  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const hasCode    = !!body.errorCode;
  const code       = body.errorCode ?? 'DW-9003';
  const message    = String(body.message ?? 'Bilinmiyor').slice(0, 800);
  const stack      = String(body.stack ?? '').slice(0, 2000);
  const url        = String(body.url ?? '').slice(0, 300);
  const ua         = String(body.userAgent ?? request.headers.get('user-agent') ?? 'Bilinmiyor').slice(0, 250);
  const logs       = (body.debugLogs ?? []).slice(-15).join('\n').slice(0, 1500);
  const context    = String(body.context ?? '').slice(0, 300);
  const compStack  = String(body.componentStack ?? '').slice(0, 1000);
  const crumbs     = (body.breadcrumbs ?? []).slice(-10).join('\n').slice(0, 800);
  const section    = String(body.section ?? '').slice(0, 100);
  const deviceInfo = String(body.deviceInfo ?? '').slice(0, 150);
  const time       = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  const embed = {
    title: hasCode
      ? `⚠️ Hata Bildirimi — \`${code}\``
      : `🔴 Yakalanmamış Hata — \`${code}\``,
    color: hasCode ? 0xF0A500 : 0xED4245,
    description: `\`\`\`${message}\`\`\``,
    fields: [
      { name: '🏷️ Kod', value: `\`${code}\``, inline: true },
      { name: '🕐 Zaman', value: time, inline: true },
      { name: '🌐 IP', value: ip, inline: true },
      ...(section ? [{ name: '📌 Section', value: section, inline: true }] : []),
      ...(deviceInfo ? [{ name: '📱 Cihaz', value: deviceInfo, inline: true }] : []),
      ...(url ? [{ name: '🔗 URL', value: url, inline: false }] : []),
      ...(context ? [{ name: '📍 Bağlam', value: context, inline: false }] : []),
      { name: '💻 User Agent', value: `\`${ua}\``, inline: false },
      ...(crumbs ? [{ name: '🧭 Son Eylemler', value: `\`\`\`${crumbs}\`\`\``, inline: false }] : []),
      ...(stack ? [{ name: '📚 Stack Trace', value: `\`\`\`${stack}\`\`\``, inline: false }] : []),
      ...(compStack ? [{ name: '⚛️ Component Stack', value: `\`\`\`${compStack}\`\`\``, inline: false }] : []),
      ...(logs ? [{ name: '📋 Debug Logları', value: `\`\`\`${logs}\`\`\``, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `DiscoWeb · Hata Sistemi · ${hasCode ? 'Kodlu Hata' : 'Yakalanmamış Hata'}` },
  };

  const discordRes = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!discordRes.ok) {
    const errText = await discordRes.text();
    console.error('[error-report] Discord API hatası:', discordRes.status, errText);
    return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
