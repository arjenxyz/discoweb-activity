import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies, requireSessionUser } from '@/lib/auth';
import { logActivityLogout } from '@/lib/activityLogger';
import { createClient } from '@supabase/supabase-js';

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
  const session = await requireSessionUser(request);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip') ?? null;
  const ua = request.headers.get('user-agent') ?? null;
  const guildId = request.cookies.get('selected_guild_id')?.value ?? null;

  await logActivityLogout({
    userId: session.ok ? session.userId : null,
    guildId,
    ip,
    userAgent: ua,
  });

  if (session.ok) {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
        await supabase.from('admin_actions').insert({
          actor_id: session.userId,
          actor_role: 'user',
          target_guild_id: guildId ?? 'global',
          action_type: 'auth_logout',
          payload_after: {
            user_id: session.userId,
            guild_id: guildId,
            ip,
            user_agent: ua,
          },
        });
      } catch {
        // log hatası logout'u durdurmasın
      }
    }
  }

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
