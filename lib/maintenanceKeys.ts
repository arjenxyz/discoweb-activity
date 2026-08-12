/** Shared maintenance module ids — safe for client + server imports. */
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
