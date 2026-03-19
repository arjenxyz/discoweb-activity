import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function GET() {
  // Only enable in development environment (or when explicitly enabled via env)
  const isDev = (process.env.NODE_ENV as string) === 'development';
  const allowDevSession = isDev || process.env.ENABLE_DEV_SESSION === 'true';

  if (!allowDevSession) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 });
  }

  const token = createSessionToken('dev-user-12345');
  const sameSiteValue = process.env.NODE_ENV === 'production' ? 'none' : 'lax';
  const secureValue = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ token });
  response.cookies.set('discord_session', token, {
    httpOnly: true,
    sameSite: sameSiteValue,
    secure: secureValue,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.set('discord_activity_session', '1', {
    httpOnly: true,
    sameSite: sameSiteValue,
    secure: secureValue,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
