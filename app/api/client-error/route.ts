import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError } from '@/lib/serverLogger';

export const dynamic = 'force-dynamic';

const CRITICAL_THRESHOLD = 3; // kaç farklı kullanıcıda → kritik
const ERROR_CHANNEL_ID = process.env.ERROR_LOG_CHANNEL_ID ?? '1484952999515394200';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';

const TYPE_LABELS: Record<string, string> = {
  js_error: '🔴 JS Hatası',
  unhandled_rejection: '🟠 Promise Rejection',
  console_error: '🟡 Console Error',
};

const NOISE = [
  'ResizeObserver loop',
  'Non-Error promise rejection',
  'Script error',
  'Load failed',
  'cancelled',
  'NetworkError',
  'AbortError',
  'ChunkLoadError',
];

// Rate limit — IP başına 10 istek/dakika (in-memory, serverless'ta yeterli)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

async function sendCriticalAlert(message: string, uniqueCount: number, type?: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  const rolePing = DEV_ROLE_ID ? `<@&${DEV_ROLE_ID}>` : '';

  await fetch(`https://discord.com/api/channels/${ERROR_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: rolePing ? `${rolePing} **Kritik hata — ${uniqueCount} farklı kullanıcıda görüldü!**` : undefined,
      embeds: [{
        title: '🚨 KRİTİK İstemci Hatası',
        description: `\`\`\`\n${message.slice(0, 1000)}\`\`\``,
        color: 0xff0000,
        fields: [
          { name: 'Tür', value: TYPE_LABELS[type ?? ''] ?? '⚪ Bilinmiyor', inline: true },
          { name: 'Etkilenen Kullanıcı', value: `**${uniqueCount}** kişi`, inline: true },
          { name: 'Eşik', value: `≥ ${CRITICAL_THRESHOLD} kullanıcı`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    }),
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) return NextResponse.json({ ok: false }, { status: 429 });

  let body: {
    type?: string;
    message?: string;
    source?: string;
    line?: number;
    col?: number;
    stack?: string;
    url?: string;
    userAgent?: string;
    timestamp?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.message) return NextResponse.json({ ok: false }, { status: 400 });
  if (NOISE.some(n => body.message?.includes(n))) return NextResponse.json({ ok: true });

  const label = TYPE_LABELS[body.type ?? ''] ?? '⚪ İstemci Hatası';

  // Normal log — her hata için
  await logError(new Error(`${label}: ${body.message}`), {
    route: `client → ${body.url ?? '?'}`,
    extra: {
      type: body.type,
      source: body.source,
      line: body.line,
      col: body.col,
      stack: body.stack,
      userAgent: body.userAgent,
      ip,
    },
  });

  // Supabase'e kaydet ve kritik eşiği kontrol et
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Hata parmak izi: mesajın ilk 120 karakteri
      const errorKey = body.message.slice(0, 120).replace(/\s+/g, ' ').trim();

      const { data: existing } = await supabase
        .from('client_error_log')
        .select('id, unique_ips, total_hits, critical_alerted')
        .eq('error_key', errorKey)
        .maybeSingle();

      if (existing) {
        const ips: string[] = existing.unique_ips ?? [];
        const isNewIp = !ips.includes(ip);
        const newIps = isNewIp ? [...ips, ip] : ips;
        const newHits = (existing.total_hits ?? 0) + 1;

        await supabase.from('client_error_log').update({
          unique_ips: newIps,
          total_hits: newHits,
          last_seen: new Date().toISOString(),
        }).eq('id', existing.id);

        // Kritik eşiğe ilk kez ulaşıldıysa alert gönder
        if (
          isNewIp &&
          newIps.length >= CRITICAL_THRESHOLD &&
          !existing.critical_alerted
        ) {
          await supabase.from('client_error_log').update({ critical_alerted: true }).eq('id', existing.id);
          await sendCriticalAlert(body.message, newIps.length, body.type);
        }
      } else {
        await supabase.from('client_error_log').insert({
          error_key: errorKey,
          message: body.message.slice(0, 800),
          type: body.type ?? null,
          unique_ips: [ip],
          total_hits: 1,
          critical_alerted: false,
        });
      }
    } catch {
      // DB hatası loglama akışını durdurmasın
    }
  }

  return NextResponse.json({ ok: true });
}
