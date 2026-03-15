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
  return NextResponse.json({ token });
}
