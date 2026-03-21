import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }

  const userId = session.userId;
  console.log('[/api/auth/me] requireSessionUser result:', userId ? `found (${userId.substring(0, 6)}...)` : 'null');

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('discord_id, username, avatar')
    .eq('discord_id', userId)
    .maybeSingle();

  // Supabase'de kayıt yoksa token geçersiz say — yeniden auth tetiklensin
  if (!user) {
    const res = NextResponse.json({ error: 'user_not_found' }, { status: 401 });
    res.cookies.set('discord_session', '', { maxAge: 0, path: '/' });
    res.cookies.set('csrf_token', '', { maxAge: 0, path: '/' });
    return res;
  }

  const avatar = user.avatar ?? null;
  const avatarUrl = avatar
    ? (avatar.startsWith('http')
        ? avatar
        : `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png?size=96`)
    : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;

  return NextResponse.json({
    id: userId,
    username: user.username ?? null,
    avatar: avatarUrl,
  });
}

