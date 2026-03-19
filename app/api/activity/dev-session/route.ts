import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function GET() {
  // Sadece development ortamında aktif — production'da ENABLE_DEV_SESSION ile bile açılmaz
  const isDev = (process.env.NODE_ENV as string) === 'development';
  if (!isDev) {
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
