import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  // Sunucunun economy_tier kontrolü
  const { data: server } = await supabase
    .from('servers')
    .select('economy_tier')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });

  // Basit ekonomide hazine yok
  if (server.economy_tier !== 'advanced') {
    return NextResponse.json({ economy_tier: 'basic', treasury: null });
  }

  const { data: treasury } = await supabase
    .from('server_treasury')
    .select('balance, total_collected, total_burned, total_dividends_paid, updated_at')
    .eq('guild_id', guildId)
    .maybeSingle();

  return NextResponse.json({
    treasury: treasury ?? {
      balance: 0,
      total_collected: 0,
      total_burned: 0,
      total_dividends_paid: 0,
      updated_at: null,
    },
  });
}
