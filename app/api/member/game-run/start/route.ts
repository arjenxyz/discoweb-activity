import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { checkMaintenance } from '@/lib/maintenance';

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server?.id) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const { error } = await supabase.from('game_runs').insert({
    id: runId,
    guild_id: server.id,
    user_id: userId,
    started_at: startedAt,
    status: 'started',
  });

  if (error) {
    return NextResponse.json({ error: 'run_start_failed' }, { status: 500 });
  }

  return NextResponse.json({ runId, startedAt });
}
