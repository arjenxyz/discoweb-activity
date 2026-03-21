import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

/**
 * Kullanıcının verilen guild'de yönetici olup olmadığını kontrol eder.
 * Sunucu sahibi VEYA Manage Server / Administrator yetkisi olmalı.
 */
export async function isGuildAdmin(userId: string, guildId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const botToken = process.env.DISCORD_BOT_TOKEN;

  // Discord Guild sahibi mi?
  if (botToken) {
    try {
      const res = await fetch(`https://discord.com/api/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const guild = (await res.json()) as { owner_id?: string };
        if (guild.owner_id === userId) return true;
      }
    } catch { /* ignore */ }
  }

  // OAuth token ile Manage Server yetkisi var mı?
  const { data: userRow } = await supabase
    .from('users')
    .select('oauth_access_token')
    .eq('discord_id', userId)
    .maybeSingle();

  if (!userRow?.oauth_access_token) return false;

  try {
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${userRow.oauth_access_token}` },
      cache: 'no-store',
    });
    if (!guildsRes.ok) return false;
    const guilds = (await guildsRes.json()) as Array<{ id: string; owner?: boolean; permissions?: string }>;
    const g = guilds.find((x) => x.id === guildId);
    if (!g) return false;
    if (g.owner) return true;
    if (g.permissions) {
      const perms = BigInt(g.permissions);
      const ADMIN = BigInt(0x8);
      const MANAGE = BigInt(0x20);
      if ((perms & ADMIN) === ADMIN || (perms & MANAGE) === MANAGE) return true;
    }
  } catch { /* ignore */ }

  return false;
}
