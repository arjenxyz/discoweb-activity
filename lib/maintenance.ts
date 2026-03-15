import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSessionUserId } from '@/lib/auth';


export const MAINTENANCE_KEYS = [
  'site',
  'store',
  'transactions',
  'tracking',
  'promotions',
  'discounts',
  'transfers',
  'bot',
] as const;

export type MaintenanceKey = (typeof MAINTENANCE_KEYS)[number];

type MaintenanceFlag = {
  key: MaintenanceKey;
  is_active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

type MaintenanceMap = Record<MaintenanceKey, MaintenanceFlag>;

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

const getUserIdFromCookies = async () => {
  try {
    return await getSessionUserId();
  } catch {
    return null;
  }
};

const isDeveloper = async (userId: string) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DEVELOPER_ROLE_ID ?? DEFAULT_DEVELOPER_ROLE_ID;
  const guildId = process.env.DEVELOPER_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? DEFAULT_DEVELOPER_GUILD_ID;

  if (!botToken || !roleId || !guildId) {
    return false;
  }
  // Use AbortController to avoid hanging requests and handle network errors gracefully
  const controller = new AbortController();
  const timeout = Number(process.env.DISCORD_API_TIMEOUT_MS ?? 10000);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const member = (await response.json()) as { roles?: string[] };
    return Boolean(member.roles?.includes(roleId));
  } catch (err) {
    // Network error, timeout, or fetch aborted — treat as non-developer to avoid crashing
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const createDefaultFlags = (): MaintenanceMap =>
  MAINTENANCE_KEYS.reduce((acc, key) => {
    acc[key] = { key, is_active: false, reason: null, updated_by: null, updated_at: null };
    return acc;
  }, {} as MaintenanceMap);

export const getMaintenanceFlags = async (guildId?: string) => {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const targetGuildId = guildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', targetGuildId)
    .maybeSingle();

  if (!server) {
    return null;
  }

  const { data } = await supabase
    .from('maintenance_flags')
    .select('key,is_active,reason,updated_by,updated_at')
    .eq('server_id', server.id);

  const flags = createDefaultFlags();
  (data ?? []).forEach((row) => {
    if (MAINTENANCE_KEYS.includes(row.key as MaintenanceKey)) {
      flags[row.key as MaintenanceKey] = {
        key: row.key as MaintenanceKey,
        is_active: Boolean(row.is_active),
        reason: row.reason ?? null,
        updated_by: row.updated_by ?? null,
        updated_at: row.updated_at ?? null,
      };
    }
  });

  return { flags, serverId: server.id };
};

export const checkMaintenance = async (keys: MaintenanceKey[], guildId?: string) => {
  const userId = await getUserIdFromCookies();
  if (userId) {
    const developer = await isDeveloper(userId);
    if (developer) {
      return { blocked: false as const, key: null, reason: null };
    }
  }

  const data = await getMaintenanceFlags(guildId);
  if (!data) {
    return { blocked: false as const, key: null, reason: null };
  }

  for (const key of keys) {
    const flag = data.flags[key];
    if (flag?.is_active) {
      return { blocked: true as const, key, reason: flag.reason };
    }
  }

  return { blocked: false as const, key: null, reason: null };
};
