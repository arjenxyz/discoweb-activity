import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserIdFromRequest, requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  // Allow auth via bearer token (for embedded activity where cookies may be blocked)
  const session = await requireSessionUser(request);
  if (!session.ok) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[member/profile] unauthorized: authorization=', request.headers.get('authorization'));
      console.log('[member/profile] unauthorized: cookie=', request.headers.get('cookie'));
    }
    return session.response;
  }
  const userId = session.userId;

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
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
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    // Fetch Discord profile data from users table (username/avatar)
    const { data: user } = await supabase
      .from('users')
      .select('discord_id, username, avatar')
      .eq('discord_id', userId)
      .maybeSingle();

    const avatarUrl = user?.avatar
      ? user.avatar.startsWith('http')
        ? user.avatar
        : `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=96`
      : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;

    if (profile) {
      // Eğer referral_code eksikse, bir tane oluştur
      if (!profile.referral_code) {
        const newCode = (() => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 6; i += 1) {
            const idx = Math.floor(Math.random() * chars.length);
            code += chars[idx];
          }
          return code;
        })();
        await supabase
          .from('member_profiles')
          .update({ referral_code: newCode, updated_at: new Date().toISOString() })
          .eq('guild_id', selectedGuildId)
          .eq('user_id', userId);
        profile.referral_code = newCode;
      }

      // Gerçek profil bulundu, dön (kullanıcı bilgilerini ekle)
      return NextResponse.json({
        ...profile,
        username: user?.username ?? null,
        avatar: avatarUrl,
      });
    }

    // Kullanıcının bu sunucuda bir profili yoksa, oluşturmaya çalış
    const generateReferralCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        const idx = Math.floor(Math.random() * chars.length);
        code += chars[idx];
      }
      return code;
    };

    const ensureReferralCode = async (): Promise<string> => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateReferralCode();
        const { error: conflict } = await supabase
          .from('member_profiles')
          .insert({
            guild_id: selectedGuildId,
            user_id: userId,
            about: null,
            referral_code: code,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (!conflict) {
          return code;
        }
        // If conflict is a unique violation on referral_code, try again
        if (conflict.code !== '23505') {
          throw conflict;
        }
      }
      throw new Error('Referral code collision');
    };

    try {
      await ensureReferralCode();
    } catch (createError) {
      console.error('member/profile: profile creation failed', createError);
      return NextResponse.json({ error: 'profile_creation_failed' }, { status: 500 });
    }

    // Yeniden çekip dön
    const { data: createdProfile } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (createdProfile) {
      return NextResponse.json(createdProfile);
    }

    // Bunlardan hiçbiri olmadıysa (garip durumda) hata döndür
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

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;

    const payload = (await request.json()) as { about?: string | null };
    const aboutValue = payload.about?.trim() ?? '';

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
    }

    const { error } = await supabase.from('member_profiles').upsert(
      {
        guild_id: selectedGuildId,
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
