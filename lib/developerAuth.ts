import { requireSessionUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

const DEVELOPER_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';

export function isDeveloper(userId: string): boolean {
  return !!DEVELOPER_USER_ID && userId === DEVELOPER_USER_ID;
}

export async function requireDeveloper(request: Request): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await requireSessionUser(request);
  if (!session.ok) return session;
  if (!isDeveloper(session.userId)) {
    return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId: session.userId };
}
