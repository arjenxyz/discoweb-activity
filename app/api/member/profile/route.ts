import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';
import { logNewUser } from '@/lib/activityLogger';
import { isLocalDevRequest, localDevProfile } from '@/lib/localDev';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  banner?: string | null;
  accent_color?: number | null;
};

type DiscordMember = {
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
  joined_at?: string;
  user?: DiscordUser;
};

type GuildRole = {
  id: string;
  name: string;
  color: number;
  position?: number;
};

function colorToHex(color: number | null | undefined): string | null {
  if (color == null || color <= 0) return null;
  return `#${color.toString(16).padStart(6, '0')}`;
}

function buildAvatarUrl(userId: string, avatar: string | null | undefined, size = 128): string {
  if (avatar) {
    if (avatar.startsWith('http')) return avatar;
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}?size=${size}`;
  }
  const fallback = Number.isFinite(Number(userId)) ? Number(BigInt(userId) % 5n) : 0;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

function buildBannerUrl(userId: string, banner: string | null | undefined): string | null {
  if (!banner) return null;
  if (banner.startsWith('http')) return banner;
  const ext = banner.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/banners/${userId}/${banner}.${ext}?size=480`;
}

function buildGuildIconUrl(guildId: string, icon: string | null | undefined): string | null {
  if (!icon) return null;
  if (icon.startsWith('http')) return icon;
  const ext = icon.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${ext}?size=64`;
}

async function fetchDiscordJson<T>(url: string, botToken: string, timeoutMs = 10000): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (isLocalDevRequest(request)) {
    return NextResponse.json(localDevProfile);
  }

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
    let profile: Record<string, any> | null = null;
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

      if (!profile) {
        const { data: anyProfile, error: anyError } = await supabase
          .from('member_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (anyError && anyError.code !== 'PGRST116') {
          throw anyError;
        }

        if (anyProfile) {
          console.warn('member/profile: no server-specific profile, using global user profile', anyProfile);
          profile = anyProfile;
        }
      }
    } catch (fetchError) {
      console.error('member/profile: profile query failed', fetchError);
      return NextResponse.json({ error: 'profile_query_failed' }, { status: 500 });
    }

    // DB fallback for username/avatar if Discord is unavailable
    let dbUser: { discord_id?: string; username?: string; avatar?: string } | null = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('discord_id, username, avatar')
        .eq('discord_id', userId)
        .maybeSingle();
      dbUser = data;
    } catch (userError) {
      console.warn('member/profile: unable to fetch discord user data from supabase', userError);
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    let discordUser: DiscordUser | null = null;
    let discordMember: DiscordMember | null = null;
    let roles: Array<{ id: string; name: string; color: number }> = [];
    let guildName: string | null = profile?.guildName ?? null;
    let guildIcon: string | null = profile?.guildIcon ?? null;
    let joinedAt: string | null = null;

    if (botToken) {
      const [member, user, guild, guildRoles] = await Promise.all([
        fetchDiscordJson<DiscordMember>(
          `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`,
          botToken,
        ),
        fetchDiscordJson<DiscordUser>(`https://discord.com/api/users/${userId}`, botToken),
        fetchDiscordJson<{ name?: string; icon?: string | null }>(
          `https://discord.com/api/guilds/${selectedGuildId}`,
          botToken,
        ),
        fetchDiscordJson<GuildRole[]>(`https://discord.com/api/guilds/${selectedGuildId}/roles`, botToken),
      ]);

      discordMember = member;
      discordUser = user ?? member?.user ?? null;
      joinedAt = member?.joined_at ?? null;

      if (guild?.name) guildName = guild.name;
      if (guild?.icon) guildIcon = buildGuildIconUrl(selectedGuildId, guild.icon);

      const roleIds = new Set(member?.roles ?? []);
      if (guildRoles && roleIds.size > 0) {
        roles = guildRoles
          .filter((r) => roleIds.has(r.id) && r.name !== '@everyone')
          .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))
          .map((r) => ({ id: r.id, name: r.name, color: r.color }));
      }
    }

    const username =
      discordUser?.username ??
      dbUser?.username ??
      profile?.username ??
      '';
    const displayName =
      discordUser?.global_name ??
      profile?.displayName ??
      username ??
      null;
    const nickname =
      discordMember?.nick ??
      profile?.nickname ??
      null;

    const avatarHash = discordMember?.avatar
      ? discordMember.avatar
      : discordUser?.avatar ?? dbUser?.avatar ?? null;
    // Guild-specific avatar uses a different CDN path
    const avatarUrl = discordMember?.avatar
      ? `https://cdn.discordapp.com/guilds/${selectedGuildId}/users/${userId}/avatars/${discordMember.avatar}.${
          discordMember.avatar.startsWith('a_') ? 'gif' : 'png'
        }?size=128`
      : buildAvatarUrl(userId, avatarHash, 128);

    const bannerUrl = buildBannerUrl(userId, discordUser?.banner ?? null);
    const bannerColor = colorToHex(discordUser?.accent_color) ?? colorToHex(roles.find((r) => r.color > 0)?.color);

    const payload = {
      userId,
      username,
      nickname,
      displayName,
      avatarUrl,
      bannerUrl,
      bannerColor,
      about: profile?.about ?? null,
      guildName,
      guildIcon,
      joinedAt,
      roles,
      tag_granted_at: profile?.tag_granted_at ?? null,
      has_tag: profile?.has_tag ?? false,
      is_booster: profile?.is_booster ?? false,
      booster_since: profile?.booster_since ?? null,
    };

    if (profile) {
      return NextResponse.json(payload);
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
      username: username || 'bilinmiyor',
      avatar: discordUser?.avatar ?? dbUser?.avatar ?? null,
      guildId: selectedGuildId,
      guildName,
      ip,
      userAgent: ua,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
