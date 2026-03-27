import { NextResponse } from 'next/server';

const CHANNEL_ID = '1484523061209202820';

// Simple in-memory rate limit: max 3 reports per IP per 5 minutes
const ipLog = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 5 * 60 * 1000;
  const hits = (ipLog.get(ip) ?? []).filter(t => now - t < window);
  if (hits.length >= 3) return true;
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

  let body: { error?: string; url?: string; debugLogs?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const errorText = String(body.error ?? 'Bilinmiyor').slice(0, 500);
  const url = String(body.url ?? '').slice(0, 300);
  const logs = (body.debugLogs ?? []).slice(-10).join('\n').slice(0, 1500);

  const embed = {
    title: '🔐 Auth Hata Bildirimi',
    color: 0xED4245,
    fields: [
      { name: '❌ Hata', value: `\`\`\`${errorText}\`\`\``, inline: false },
      ...(url ? [{ name: '🔗 URL', value: url, inline: false }] : []),
      ...(logs ? [{ name: '📋 Debug Logları', value: `\`\`\`${logs}\`\`\``, inline: false }] : []),
      { name: '🌐 IP', value: ip, inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'DiscoWeb · Auth Hata Bildirimi' },
  };

  const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'discord_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
