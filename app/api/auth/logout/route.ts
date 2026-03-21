import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies } from '@/lib/auth';

// Çıkış işlemini yapan ana fonksiyon
function handleLogout(request: NextRequest) {
  // 1. Kullanıcıyı ana sayfaya yönlendir
  const response = NextResponse.redirect(new URL('/', request.url));

  // 2. Cookie'leri sil
  clearSessionCookies(response);

  response.cookies.set('discord_user_id', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0, // Hemen sil
    path: '/',
  });

  response.cookies.set('discord_access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('selected_guild_id', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('discord_activity_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

// POST isteği — JSON kabul ediyorsa redirect yerine 200 JSON döndür (Activity iframe / fetch desteği)
export async function POST(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('application/json')) {
    const response = NextResponse.json({ ok: true });
    clearSessionCookies(response);
    ['discord_user_id', 'discord_access_token', 'selected_guild_id', 'discord_activity_session'].forEach(name => {
      response.cookies.set(name, '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
    });
    return response;
  }
  return handleLogout(request);
}

// GET isteği (Yönlendirme hatası veya elle giriş olursa burası devreye girer ve 405'i engeller)
export async function GET(request: NextRequest) {
  return handleLogout(request);
}
