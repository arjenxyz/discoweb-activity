import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance } from '@/lib/maintenance';
import { getServerRow, getSupabase } from './db';

export async function requirePlayEarnContext(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'maintenance', key: maintenance.key }, { status: 503 }),
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false as const, response: NextResponse.json({ error: 'missing_service_role' }, { status: 500 }) };
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return { ok: false as const, response: session.response };
  }

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return { ok: false as const, response: NextResponse.json({ error: 'missing_guild' }, { status: 400 }) };
  }

  const server = await getServerRow(supabase, guildId);
  if (!server) {
    return { ok: false as const, response: NextResponse.json({ error: 'server_not_found' }, { status: 404 }) };
  }

  return {
    ok: true as const,
    supabase,
    userId: session.userId,
    guildId,
    server,
  };
}
