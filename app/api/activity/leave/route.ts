import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { logActivityLogout } from '@/lib/activityLogger';
import { getSelectedGuildId } from '@/lib/guild';

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

  await logActivityLogout({
    userId: session.ok ? session.userId : null,
    username,
    guildId,
    ip,
    userAgent: ua,
  });

  return NextResponse.json({ ok: true });
}
