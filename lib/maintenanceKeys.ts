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

/** UI-only key for emergency stop (not a panel maintenance module). */
export const INCIDENT_UI_KEY = 'incident' as const;

export type MaintenanceUiKey = MaintenanceKey | typeof INCIDENT_UI_KEY;
