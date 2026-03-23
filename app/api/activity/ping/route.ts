/**
 * Activity açıldığında "hızlı yol" (session zaten geçerli) durumunda çağrılır.
 * Sadece login logu atar — tam auth akışı gerekmez.
 */
import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { logActivityLogin } from '@/lib/activityLogger';
import { getSelectedGuildId } from '@/lib/guild';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip') ?? null;
  const ua = request.headers.get('user-agent') ?? null;
  const guildId = await getSelectedGuildId(request);

  let username = 'bilinmiyor';
  let avatar: string | null = null;
  try {
    const body = await request.json() as { username?: string; avatar?: string };
    username = body?.username ?? username;
    avatar = body?.avatar ?? null;
  } catch { /* opsiyonel */ }

  // Aktif session'ı upsert et
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey && guildId) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    await supabase.from('activity_online_sessions').upsert(
      { user_id: session.userId, guild_id: guildId, last_seen: new Date().toISOString() },
      { onConflict: 'user_id,guild_id' }
    );
  }

  await logActivityLogin({
    userId: session.userId,
    username,
    avatar,
    guildId,
    guildName: null,
    isNewUser: false,
    ip,
    userAgent: ua,
    tokenExpiresAt: null,
  });

  return NextResponse.json({ ok: true });
}
