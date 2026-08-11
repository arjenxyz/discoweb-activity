import { NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';
import { isLocalDevRequest, LOCAL_DEV_GUILD_ID, LOCAL_DEV_USER_ID } from '@/lib/localDev';

export async function GET(request: Request) {
  // Sadece localhost + development — production'da asla açılmaz
  if (!isLocalDevRequest(request)) {
    return NextResponse.json({ error: 'not_available' }, { status: 403 });
  }

  let token: string | null = null;
  try {
    token = createSessionToken(LOCAL_DEV_USER_ID);
  } catch {
    // SESSION_SECRET yoksa cookie olmadan da localhost API bypass çalışır
  }

  const sameSiteValue = 'lax' as const;
  const secureValue = false;

  const response = NextResponse.json({
    token,
    userId: LOCAL_DEV_USER_ID,
    guildId: LOCAL_DEV_GUILD_ID,
  });

  if (token) {
    response.cookies.set('discord_session', token, {
      httpOnly: true,
      sameSite: sameSiteValue,
      secure: secureValue,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
  }

  response.cookies.set('discord_activity_session', '1', {
    httpOnly: true,
    sameSite: sameSiteValue,
    secure: secureValue,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.set('selected_guild_id', LOCAL_DEV_GUILD_ID, {
    httpOnly: false,
    sameSite: sameSiteValue,
    secure: secureValue,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}
