/**
 * Activity açıldığında "hızlı yol" (session zaten geçerli) durumunda çağrılır.
 * Sadece login logu atar — tam auth akışı gerekmez.
 */
import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { logActivityLogin } from '@/lib/activityLogger';
import { getSelectedGuildId } from '@/lib/guild';

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
