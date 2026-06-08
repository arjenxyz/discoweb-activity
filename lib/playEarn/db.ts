import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PLAY_EARN_CONFIG, type PlayEarnConfig } from './types';

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function getServerRow(supabase: SupabaseClient, discordGuildId: string) {
  const { data } = await supabase
    .from('servers')
    .select('id, discord_id, is_setup')
    .eq('discord_id', discordGuildId)
    .eq('is_setup', true)
    .maybeSingle();
  return data;
}

export async function getOrCreateConfig(
  supabase: SupabaseClient,
  serverId: string,
): Promise<PlayEarnConfig> {
  const { data: existing } = await supabase
    .from('play_earn_config')
    .select('*')
    .eq('server_id', serverId)
    .maybeSingle();

  if (existing) {
    return {
      jeton_per_papel: Number(existing.jeton_per_papel ?? DEFAULT_PLAY_EARN_CONFIG.jeton_per_papel),
      daily_papel_cap: Number(existing.daily_papel_cap ?? DEFAULT_PLAY_EARN_CONFIG.daily_papel_cap),
      min_convert_jeton: Number(existing.min_convert_jeton ?? DEFAULT_PLAY_EARN_CONFIG.min_convert_jeton),
      session_duration_sec: Number(existing.session_duration_sec ?? DEFAULT_PLAY_EARN_CONFIG.session_duration_sec),
      session_cooldown_sec: Number(existing.session_cooldown_sec ?? DEFAULT_PLAY_EARN_CONFIG.session_cooldown_sec),
      max_sessions_per_day: Number(existing.max_sessions_per_day ?? DEFAULT_PLAY_EARN_CONFIG.max_sessions_per_day),
      game_enabled: Boolean(existing.game_enabled ?? DEFAULT_PLAY_EARN_CONFIG.game_enabled),
      difficulty_ramp_interval_sec: Number(
        existing.difficulty_ramp_interval_sec ?? DEFAULT_PLAY_EARN_CONFIG.difficulty_ramp_interval_sec,
      ),
      speed_ramp_percent: Number(existing.speed_ramp_percent ?? DEFAULT_PLAY_EARN_CONFIG.speed_ramp_percent),
      spawn_ramp_percent: Number(existing.spawn_ramp_percent ?? DEFAULT_PLAY_EARN_CONFIG.spawn_ramp_percent),
    };
  }

  const row = { server_id: serverId, ...DEFAULT_PLAY_EARN_CONFIG };
  await supabase.from('play_earn_config').insert(row);
  return { ...DEFAULT_PLAY_EARN_CONFIG };
}

export async function getTodayStats(
  supabase: SupabaseClient,
  serverId: string,
  userId: string,
) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('play_earn_daily_stats')
    .select('*')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .eq('stat_date', today)
    .maybeSingle();
  return data;
}

export async function bumpDailyStats(
  supabase: SupabaseClient,
  serverId: string,
  userId: string,
  patch: { sessions_count?: number; papel_converted_today?: number },
) {
  const today = new Date().toISOString().split('T')[0];
  const current = await getTodayStats(supabase, serverId, userId);
  const nextSessions = (current?.sessions_count ?? 0) + (patch.sessions_count ?? 0);
  const nextPapel = Number(current?.papel_converted_today ?? 0) + (patch.papel_converted_today ?? 0);

  await supabase.from('play_earn_daily_stats').upsert(
    {
      server_id: serverId,
      user_id: userId,
      stat_date: today,
      sessions_count: nextSessions,
      papel_converted_today: nextPapel,
    },
    { onConflict: 'server_id,user_id,stat_date' },
  );
}
