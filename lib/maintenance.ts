import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
