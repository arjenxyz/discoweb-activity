'use client';

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabaseClient';

export interface RealtimeDashboardOptions {
  guildId: string | null;
  userId: string | null;
  /** Cüzdan bakiyesi güncellenince çağrılır */
  onWalletUpdate?: (balance: number) => void;
  /** Yeni mail gelince çağrılır */
  onMailInsert?: () => void;
  /** Yeni bildirim gelince çağrılır */
  onNotificationInsert?: () => void;
  /** Borsa listing fiyatı güncellenince çağrılır */
  onMarketListingUpdate?: (payload: { guild_id: string; market_price: number }) => void;
  /** Yeni borsa işlemi gerçekleşince çağrılır */
  onMarketTradeInsert?: (payload: { guild_id: string }) => void;
  /** Yeni piyasa olayı eklenince çağrılır */
  onMarketEventInsert?: () => void;
  /** Hazine bakiyesi güncellenince çağrılır */
  onTreasuryUpdate?: (balance: number) => void;
  /** Sunucu genel istatistikleri güncellenince çağrılır */
  onOverviewStatsUpdate?: () => void;
  /** Biriken kazanç (daily_earnings) değişince çağrılır */
  onDailyEarningsUpdate?: () => void;
}

export function useRealtimeDashboard({
  guildId,
  userId,
  onWalletUpdate,
  onMailInsert,
  onNotificationInsert,
  onMarketListingUpdate,
  onMarketTradeInsert,
  onMarketEventInsert,
  onTreasuryUpdate,
  onOverviewStatsUpdate,
  onDailyEarningsUpdate,
}: RealtimeDashboardOptions) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!guildId || !userId) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channels: RealtimeChannel[] = [];

    // 1. Cüzdan bakiyesi
    if (onWalletUpdate) {
      const ch = supabase
        .channel(`wallet:${guildId}:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'member_wallets',
            filter: `guild_id=eq.${guildId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const rec = payload.new;
            if (rec.user_id === userId && typeof rec.balance === 'number') {
              onWalletUpdate(rec.balance);
            }
          },
        )
        .subscribe();
      channels.push(ch);
    }

    // 2. Mail
    if (onMailInsert) {
      const ch = supabase
        .channel(`mail:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'system_mails',
            filter: `guild_id=eq.${guildId}`,
          },
          () => onMailInsert(),
        )
        .subscribe();
      channels.push(ch);
    }

    // 3. Bildirimler
    if (onNotificationInsert) {
      const ch = supabase
        .channel(`notif:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => onNotificationInsert(),
        )
        .subscribe();
      channels.push(ch);
    }

    // 4. Borsa listing güncellemesi
    if (onMarketListingUpdate) {
      const ch = supabase
        .channel(`market:${guildId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'server_listings',
            filter: `guild_id=eq.${guildId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const rec = payload.new;
            if (typeof rec.guild_id === 'string' && typeof rec.market_price === 'number') {
              onMarketListingUpdate({ guild_id: rec.guild_id, market_price: rec.market_price });
            }
          },
        )
        .subscribe();
      channels.push(ch);
    }

    // 5. Borsa işlemleri
    if (onMarketTradeInsert) {
      const ch = supabase
        .channel(`trades:${guildId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'market_trades',
            filter: `guild_id=eq.${guildId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            if (typeof payload.new.guild_id === 'string') {
              onMarketTradeInsert({ guild_id: payload.new.guild_id as string });
            }
          },
        )
        .subscribe();
      channels.push(ch);
    }

    // 6. Piyasa olayları
    if (onMarketEventInsert) {
      const ch = supabase
        .channel(`events:${guildId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'market_events',
            filter: `guild_id=eq.${guildId}`,
          },
          () => onMarketEventInsert(),
        )
        .subscribe();
      channels.push(ch);
    }

    // 7. Hazine
    if (onTreasuryUpdate) {
      const ch = supabase
        .channel(`treasury:${guildId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'server_treasury',
            filter: `guild_id=eq.${guildId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            if (typeof payload.new.balance === 'number') {
              onTreasuryUpdate(payload.new.balance);
            }
          },
        )
        .subscribe();
      channels.push(ch);
    }

    // 8. Biriken kazanç (daily_earnings) — bot yeni kazanç yazdığında anlık güncelle
    if (onDailyEarningsUpdate) {
      const ch = supabase
        .channel(`earnings:${guildId}:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'daily_earnings',
            filter: `guild_id=eq.${guildId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            if (payload.new?.user_id === userId) {
              onDailyEarningsUpdate();
            }
          },
        )
        .subscribe();
      channels.push(ch);
    }

    // 9. Sunucu mesaj/ses istatistikleri
    if (onOverviewStatsUpdate) {
      const ch = supabase
        .channel(`serverstats:${guildId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'server_overview_stats',
            filter: `guild_id=eq.${guildId}`,
          },
          () => onOverviewStatsUpdate(),
        )
        .subscribe();
      channels.push(ch);
    }

    channelsRef.current = channels;

    return () => {
      for (const ch of channelsRef.current) {
        ch.unsubscribe();
      }
      channelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId, userId]);
}
