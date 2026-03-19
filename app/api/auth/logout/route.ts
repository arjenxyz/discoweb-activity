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

// POST isteği (Normal buton tıklaması)
export async function POST(request: NextRequest) {
  return handleLogout(request);
}

// GET isteği (Yönlendirme hatası veya elle giriş olursa burası devreye girer ve 405'i engeller)
export async function GET(request: NextRequest) {
  return handleLogout(request);
}
