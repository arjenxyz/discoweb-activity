import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { discordFetch } from '@/lib/discordRest';

const DISCORD_API = 'https://discord.com/api/v10';

export const SUPABASE_KEEPALIVE_CHANNEL_ID = '1520751495912489060';
export const SUPABASE_KEEPALIVE_GUILD_ID = '1465698764453838882';

export type KeepaliveResult = {
  ok: boolean;
  supabase_latency_ms: number;
  error?: string;
};

export function getKeepaliveSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function pingSupabase(supabase: SupabaseClient): Promise<KeepaliveResult> {
  const t0 = Date.now();
  const { error } = await supabase.from('app_config').select('key').limit(1);
  const latency = Date.now() - t0;
  if (error) {
    return { ok: false, supabase_latency_ms: latency, error: error.message };
  }
  return { ok: true, supabase_latency_ms: latency };
}

export async function notifyKeepaliveDiscord(
  result: KeepaliveResult,
): Promise<{ sent: boolean; reason?: string }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.SUPABASE_KEEPALIVE_CHANNEL_ID ?? SUPABASE_KEEPALIVE_CHANNEL_ID;
  const guildId = process.env.DISCORD_GUILD_ID ?? SUPABASE_KEEPALIVE_GUILD_ID;

  if (!botToken) return { sent: false, reason: 'missing_bot_token' };

  const embed = {
    title: result.ok ? '✅ Supabase Keepalive — Başarılı' : '❌ Supabase Keepalive — Başarısız',
    description: result.ok
      ? 'Supabase projesi aktif tutuldu (cron-job.org ping).'
      : `Ping başarısız: ${result.error ?? 'bilinmeyen hata'}`,
    color: result.ok ? 0x57f287 : 0xed4245,
    fields: [
      { name: 'Gecikme', value: `${result.supabase_latency_ms} ms`, inline: true },
      { name: 'Durum', value: result.ok ? 'OK' : 'HATA', inline: true },
    ],
    footer: { text: `Discoweb · Sunucu ${guildId}` },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await discordFetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { sent: false, reason: `discord_${res.status}: ${text.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'discord_fetch_failed' };
  }
}
