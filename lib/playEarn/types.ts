export type FishTypeDef = {
  id: string;
  sprite: string;
  tokens: number;
  weight: number;
};

export type SpawnEntry = {
  spawnId: string;
  fishType: string;
  sprite: string;
  lane: number;
  spawnAtMs: number;
  speedPxPerSec: number;
  tokenValue: number;
  hitRadiusPx: number;
  validUntilMs: number;
};

export type PlayEarnConfig = {
  jeton_per_papel: number;
  daily_papel_cap: number;
  min_convert_jeton: number;
  session_duration_sec: number;
  session_cooldown_sec: number;
  max_sessions_per_day: number;
  game_enabled: boolean;
  difficulty_ramp_interval_sec: number;
  speed_ramp_percent: number;
  spawn_ramp_percent: number;
};

export const DEFAULT_PLAY_EARN_CONFIG: PlayEarnConfig = {
  jeton_per_papel: 100,
  daily_papel_cap: 40,
  min_convert_jeton: 100,
  session_duration_sec: 90,
  session_cooldown_sec: 120,
  max_sessions_per_day: 15,
  game_enabled: true,
  difficulty_ramp_interval_sec: 15,
  speed_ramp_percent: 15,
  spawn_ramp_percent: 10,
};

export const FISH_TYPES: FishTypeDef[] = [
  { id: 'fish_blue', sprite: 'fish_blue.png', tokens: 1, weight: 45 },
  { id: 'fish_green', sprite: 'fish_green.png', tokens: 2, weight: 30 },
  { id: 'fish_pink', sprite: 'fish_pink.png', tokens: 5, weight: 18 },
  { id: 'fish_orange', sprite: 'fish_orange.png', tokens: 8, weight: 7 },
];

export const SCREEN_WIDTH_PX = 800;
export const LANE_COUNT = 4;
