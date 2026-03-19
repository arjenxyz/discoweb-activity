import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
