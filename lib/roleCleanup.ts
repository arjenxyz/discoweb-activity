import { type SupabaseClient } from '@supabase/supabase-js';
import { discordFetch } from './discordRest';
import { logBotError } from './activityLogger';

/**
 * Süresi dolmuş rolleri Discord'dan kaldırır ve DB'de revoked olarak işaretler.
 * Bot çevrimdışı olsa bile web tarafından çalışır.
 */
export async function cleanupExpiredRolesForUser(
  supabase: SupabaseClient,
  serverId: string,
  guildId: string,
  userId: string,
  botToken: string | undefined,
) {
  if (!botToken) return;

  const nowIso = new Date().toISOString();
  const { data: expiredOrders, error } = await supabase
    .from('store_orders')
    .select('id,role_id')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .eq('status', 'paid')
    .not('expires_at', 'is', null)
    .lte('expires_at', nowIso)
    .is('revoked_at', null);

  if (error || !expiredOrders?.length) return;

  for (const order of expiredOrders) {
    if (!order.role_id) continue;

    try {
      const res = await discordFetch(
        `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${order.role_id}`,
        { method: 'DELETE', headers: { Authorization: `Bot ${botToken}` } },
      );

      // 204 = silindi, 404 = zaten yok — ikisi de revoke edilebilir
      if (res.ok || res.status === 404) {
        await supabase
          .from('store_orders')
          .update({ revoked_at: nowIso })
          .eq('id', order.id);
      }
    } catch (err) {
      console.warn('cleanupExpiredRolesForUser failed', { userId, guildId, roleId: order.role_id, err });
      await logBotError({ errorType: 'role_revoke_failed', userId, guildId, roleId: order.role_id, orderId: order.id, detail: String(err).slice(0, 200) });
    }
  }
}
