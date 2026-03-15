import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserId } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || '1465698764453838882';
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  // Development mode'da önce Supabase'i dene, kullanıcı yoksa mock veri dön
  const userId = await getSessionUserId();
  if (!userId) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[member/profile] unauthorized: authorization=', request.headers.get('authorization'));
      console.log('[member/profile] unauthorized: cookie=', request.headers.get('cookie'));
    }
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  try {
    // Önce Supabase'den kullanıcıyı dene
    const { data: profile, error } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (profile) {
      // Gerçek profil bulundu, dön
      return NextResponse.json(profile);
    }

    // Development modunda kullanıcı bulunamadı, mock veri dön
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 Development mode: User ${userId} not found in Supabase, returning mock data`);
      return NextResponse.json({
        id: userId,
        username: 'DevUser',
        nickname: 'Dev User',
        displayName: 'Dev User',
        avatarUrl: '/gif/cat.gif',
        discriminator: '0001',
        balance: 1000,
        level: 1,
        xp: 0,
        daily_streak: 0,
        last_daily: null,
        created_at: new Date().toISOString(),
        roles: [
          { id: 'member-role', name: 'Member', color: 0x95a5a6 },
          { id: 'vip-role', name: 'VIP', color: 0xf39c12 }
        ],
        guilds: [
          { id: 'dev-guild', name: 'Development Server', icon: null }
        ]
      });
    }

    // Production modunda kullanıcı bulunamadı
    return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as { about?: string | null };
    const aboutValue = payload.about?.trim() ?? '';

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const selectedGuildId = await getSelectedGuildId();

    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    const serverId = server?.id || selectedGuildId;

    const { error } = await supabase.from('member_profiles').upsert(
      {
        guild_id: serverId,
        user_id: userId,
        about: aboutValue.length ? aboutValue : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guild_id,user_id' },
    );

    if (error) {
      return NextResponse.json({ error: 'save_failed' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ error: 'unhandled_exception' }, { status: 500 });
  }
}
