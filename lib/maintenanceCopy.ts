import { MAINTENANCE_KEYS, type MaintenanceKey } from '@/lib/maintenanceKeys';

export type MaintenanceCopy = {
  title: string;
  description: string;
  helper: string;
};

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export const ENTRY_BLOCKING_MAINTENANCE_KEYS: MaintenanceKey[] = ['site', 'activity', 'bot'];

export function isMaintenanceKey(value: string): value is MaintenanceKey {
  return (MAINTENANCE_KEYS as readonly string[]).includes(value);
}

export function resolveMaintenanceKey(
  status: string,
  debug?: Record<string, unknown>,
): MaintenanceKey | null {
  if (status === 'bot_maintenance') return 'bot';
  if (status !== 'maintenance') return null;

  const key = debug?.key;
  if (typeof key === 'string' && isMaintenanceKey(key)) return key;
  return 'site';
}

export function getMaintenanceCopy(
  key: MaintenanceKey,
  t: TranslateFn,
): MaintenanceCopy {
  return {
    title: t(`maintenance_${key}_title`),
    description: t(`maintenance_${key}_description`),
    helper: t(`maintenance_${key}_helper`),
  };
}

export function getMaintenanceShortMessage(
  key: MaintenanceKey,
  t: TranslateFn,
): string {
  return t(`maintenance_${key}_short`);
}

/** First active entry-blocking module (site → activity → bot). */
export function getEntryBlockingMaintenanceKey(
  flags: Partial<Record<MaintenanceKey, { is_active?: boolean }>> | null | undefined,
): MaintenanceKey | null {
  if (!flags) return null;
  for (const key of ENTRY_BLOCKING_MAINTENANCE_KEYS) {
    if (flags[key]?.is_active) return key;
  }
  return null;
}
