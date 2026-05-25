export type CustomRoleStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';

export type CustomRoleRequestRow = {
  id: string;
  guild_id: string;
  requester_id: string;
  target_user_id: string | null;
  status: CustomRoleStatus;
  role_name: string;
  role_color: number;
  role_emoji: string | null;
  hoist: boolean;
  mentionable: boolean;
  requester_note: string | null;
  duration_hours: number | null;
  expires_at: string | null;
  auto_assign: boolean;
  discord_role_id: string | null;
  assigned_at: string | null;
  reviewed_by: string | null;
  admin_note: string | null;
  hierarchy_ack: boolean;
  source: 'user_request' | 'raffle_winner';
  raffle_label: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomRoleDraft = {
  role_name: string;
  role_color: string;
  role_emoji: string;
  hoist: boolean;
  mentionable: boolean;
  requester_note: string;
};

export const CUSTOM_ROLE_NAME_MAX = 100;

export function hexToDiscordColor(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return 0x5865f2;
  return parseInt(clean, 16);
}

export function discordColorToHex(color: number): string {
  return `#${(color & 0xffffff).toString(16).padStart(6, '0')}`;
}
