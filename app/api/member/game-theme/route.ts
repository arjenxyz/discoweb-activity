import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

type GameTheme = {
  id: string;
  image_url: string;
  weight: number;
};

const chooseWeightedTheme = (themes: GameTheme[]): GameTheme | null => {
  if (themes.length === 0) return null;
  const total = themes.reduce((sum, t) => sum + Math.max(1, Number(t.weight || 1)), 0);
  let roll = Math.random() * total;
  for (const theme of themes) {
    roll -= Math.max(1, Number(theme.weight || 1));
    if (roll <= 0) return theme;
  }
  return themes[themes.length - 1];
};

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const guildId = await getSelectedGuildId(request);
  const supabase = getSupabaseServiceClient();
  if (!supabase || !guildId) {
    return NextResponse.json({ imageUrl: '/menu-background/varyant3.jpg', source: 'fallback' });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server?.id) {
    return NextResponse.json({ imageUrl: '/menu-background/varyant3.jpg', source: 'fallback' });
  }

  const { data } = await supabase
    .from('game_themes')
    .select('id,image_url,weight')
    .eq('active', true)
    .or(`guild_id.eq.${server.id},guild_id.is.null`)
    .limit(100);

  const selected = chooseWeightedTheme((data ?? []) as GameTheme[]);
  if (!selected?.image_url) {
    return NextResponse.json({ imageUrl: '/menu-background/varyant3.jpg', source: 'fallback' });
  }

  return NextResponse.json({
    imageUrl: selected.image_url,
    source: 'supabase',
    themeId: selected.id,
  });
}
