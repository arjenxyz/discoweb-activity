import { headers } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSessionUserId, getSessionUserIdFromRequest } from '@/lib/auth';
import { isLocalDev } from '@/lib/localDev';

/** Global (platform-wide) maintenance modules — not per Discord server. */
export const MAINTENANCE_KEYS = [
  'site',
  'store',
  'transactions',
  'tracking',
  'promotions',
  'discounts',
  'transfers',
  'bot',
  'activity',
] as const;

export type MaintenanceKey = (typeof MAINTENANCE_KEYS)[number];

export type MaintenanceFlag = {
  key: MaintenanceKey;
  is_active: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

export type MaintenanceMap = Record<MaintenanceKey, MaintenanceFlag>;

const DEFAULT_DEVELOPER_GUILD_ID = '1465698764453838882';
const DEFAULT_DEVELOPER_ROLE_ID = '1467580199481639013';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isDeveloperUser = async (userId: string): Promise<boolean> => {
  const configuredUserId = process.env.DEVELOPER_DISCORD_USER_ID;
  if (configuredUserId && userId === configuredUserId) {
    return true;
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const roleId = process.env.DEVELOPER_ROLE_ID ?? DEFAULT_DEVELOPER_ROLE_ID;
  const guildId =
    process.env.DEVELOPER_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? DEFAULT_DEVELOPER_GUILD_ID;

  if (!botToken || !roleId || !guildId) {
    return false;
  }

  const controller = new AbortController();
  const timeout = Number(process.env.DISCORD_API_TIMEOUT_MS ?? 10000);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const member = (await response.json()) as { roles?: string[] };
    return Boolean(member.roles?.includes(roleId));
  } catch {
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

/** Global flags for the whole platform. `guildId` is ignored (kept for call-site compat). */
export const getMaintenanceFlags = async (_guildId?: string) => {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('global_maintenance_flags')
    .select('key,is_active,reason,updated_by,updated_at');

  if (error) {
    console.error('[maintenance] getMaintenanceFlags', error.message);
    return null;
  }

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

  return { flags, serverId: null as string | null };
};

export const checkGlobalFreeze = async (): Promise<{ frozen: boolean; readOnly: boolean }> => {
  const supabase = getSupabase();
  if (!supabase) return { frozen: false, readOnly: false };

  const { data } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', ['global_freeze', 'read_only_mode']);

  const map: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    map[row.key] = row.value;
  });

  return {
    frozen: map['global_freeze'] === 'true',
    readOnly: map['read_only_mode'] === 'true',
  };
};

/** Resolve caller userId from cookie session or Activity Bearer header. */
const resolveCallerUserId = async (request?: Request): Promise<string | null> => {
  if (request) {
    const fromRequest = getSessionUserIdFromRequest(request);
    if (fromRequest) return fromRequest;
  }

  const fromCookie = await getSessionUserId();
  if (fromCookie) return fromCookie;

  // App Router: Authorization may be present even when Request wasn't passed through.
  try {
    const h = await headers();
    const synthetic = new Request('http://localhost', {
      headers: {
        authorization: h.get('authorization') ?? '',
        cookie: h.get('cookie') ?? '',
        'x-access-token': h.get('x-access-token') ?? '',
        'x-authorization': h.get('x-authorization') ?? '',
        'x-discord-session': h.get('x-discord-session') ?? '',
      },
    });
    return getSessionUserIdFromRequest(synthetic);
  } catch {
    return null;
  }
};

export const checkMaintenance = async (
  keys: MaintenanceKey[],
  guildIdOrRequest?: string | Request,
) => {
  const request = guildIdOrRequest instanceof Request ? guildIdOrRequest : undefined;
  const guildId = typeof guildIdOrRequest === 'string' ? guildIdOrRequest : undefined;

  // Developers (and local-dev) bypass maintenance at API level — same as web.
  if (await isLocalDev()) {
    return { blocked: false as const, key: null, reason: null };
  }

  try {
    const userId = await resolveCallerUserId(request);
    if (userId && (await isDeveloperUser(userId))) {
      return { blocked: false as const, key: null, reason: null };
    }
  } catch {
    /* non-session callers still subject to flags */
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
