import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserIdFromRequest, requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';
import { logNewUser } from '@/lib/activityLogger';

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
    let profile = null;
    try {
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      profile = data;

      // Eğer guild scoped profile bulunamazsa, global user_id eşleşmesine bak
      if (!profile) {
        const { data: globalProfile, error: globalError } = await supabase
          .from('member_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (globalError && globalError.code !== 'PGRST116') {
          throw globalError;
        }

        if (globalProfile) {
          console.warn('member/profile: no server-specific profile, using global user profile', globalProfile);
          profile = globalProfile;
        }
      }
    } catch (fetchError) {
      console.error('member/profile: profile query failed', fetchError);
      return NextResponse.json({ error: 'profile_query_failed' }, { status: 500 });
    }

    // Fetch Discord profile data from users table (username/avatar)
    // If not present, fall back to Discord API via bot token
    let user: { discord_id?: string; username?: string; avatar?: string } | null = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('discord_id, username, avatar')
        .eq('discord_id', userId)
        .maybeSingle();
      user = data;
    } catch (userError) {
      console.warn('member/profile: unable to fetch discord user data from supabase', userError);
      user = null;
    }

    // If we couldn't fetch from Supabase, try Discord API (bot token) for avatar/username
    if (!user && process.env.DISCORD_BOT_TOKEN && selectedGuildId) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 10000);
        const userRes = await fetch(`https://discord.com/api/users/${userId}`, {
          headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (userRes.ok) {
          user = await userRes.json();
        }
      } catch (err) {
        console.warn('member/profile: discord api user fetch failed', err);
      }
    }

    const avatarUrl = user?.avatar
      ? user.avatar.startsWith('http')
        ? user.avatar
        : `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=96`
      : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;

    let roles: Array<{ id: string; name: string; color: number }> | null = null;

    // Discord API üzerinden roller alınmaya çalışsın (bot token gerektirir)
    if (process.env.DISCORD_BOT_TOKEN && selectedGuildId) {
      try {
        const memberCtrl = new AbortController();
        const memberTid = setTimeout(() => memberCtrl.abort(), 10000);
        const memberRes = await fetch(
          `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`,
          {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
            signal: memberCtrl.signal,
          },
        );
        clearTimeout(memberTid);

        if (memberRes.ok) {
          const memberData = (await memberRes.json()) as { roles?: string[] };
          const roleIds = memberData.roles || [];

          if (roleIds.length > 0) {
            const rolesCtrl = new AbortController();
            const rolesTid = setTimeout(() => rolesCtrl.abort(), 10000);
            const rolesRes = await fetch(
              `https://discord.com/api/guilds/${selectedGuildId}/roles`,
              {
                headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
                signal: rolesCtrl.signal,
              },
            );
            clearTimeout(rolesTid);

            if (rolesRes.ok) {
              const rolesData = (await rolesRes.json()) as Array<{
                id: string;
                name: string;
                color: number;
              }>;
              roles = rolesData.filter((r) => roleIds.includes(r.id));
            }
          }
        }
      } catch (roleErr) {
        console.warn('member/profile: role fetch failed', roleErr);
      }
    }

    if (profile) {
      return NextResponse.json({
        userId,
        username: user?.username ?? profile.username ?? '',
        nickname: profile.nickname ?? null,
        displayName: profile.displayName ?? null,
        avatarUrl,
        about: profile.about ?? null,
        guildName: profile.guildName ?? null,
        guildIcon: profile.guildIcon ?? null,
        roles: roles ?? [],
        tag_granted_at: profile.tag_granted_at ?? null,
        has_tag: profile.has_tag ?? false,
        is_booster: profile.is_booster ?? false,
        booster_since: profile.booster_since ?? null,
      });
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('member_profiles').upsert(
      {
        guild_id: selectedGuildId,
        user_id: userId,
        about: null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'guild_id,user_id' },
    );

    if (insertError) {
      console.warn('member/profile: profile upsert failed', insertError);
      return NextResponse.json({ error: 'profile_creation_failed' }, { status: 500 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip') ?? null;
    const ua = request.headers.get('user-agent') ?? null;
    await logNewUser({
      userId,
      username: user?.username ?? 'bilinmiyor',
      avatar: user?.avatar ?? null,
      guildId: selectedGuildId,
      guildName: null,
      ip,
      userAgent: ua,
    });

    const { data: createdProfile } = await supabase
      .from('member_profiles')
      .select('*')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (createdProfile) {
      return NextResponse.json({
        userId,
        username: user?.username ?? createdProfile.username ?? '',
        nickname: createdProfile.nickname ?? null,
        displayName: createdProfile.displayName ?? null,
        avatarUrl,
        about: createdProfile.about ?? null,
        guildName: createdProfile.guildName ?? null,
        guildIcon: createdProfile.guildIcon ?? null,
        roles: roles ?? [],
        tag_granted_at: createdProfile.tag_granted_at ?? null,
        has_tag: createdProfile.has_tag ?? false,
        is_booster: createdProfile.is_booster ?? false,
        booster_since: createdProfile.booster_since ?? null,
      });
    }

    // Bunlardan hiçbiri olmadıysa (garip durumda) sorunlu prolfile oluşturma hatası
    return NextResponse.json({ error: 'profile_creation_failed' }, { status: 500 });

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
