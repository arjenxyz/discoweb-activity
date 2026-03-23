import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { logActivityLogout } from '@/lib/activityLogger';
import { getSelectedGuildId } from '@/lib/guild';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip') ?? null;
  const ua = request.headers.get('user-agent') ?? null;
  const guildId = await getSelectedGuildId(request);

  let username: string | null = null;
  try {
    const body = await request.json() as { username?: string };
    username = body?.username ?? null;
  } catch { /* beacon body opsiyonel */ }

  // Aktif session'ı sil
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey && session.ok && guildId) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    await supabase.from('activity_sessions')
      .delete()
      .match({ user_id: session.userId, guild_id: guildId });
  }

  await logActivityLogout({
    userId: session.ok ? session.userId : null,
    username,
    guildId,
    ip,
    userAgent: ua,
  });

  return NextResponse.json({ ok: true });
}
