import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance } from '@/lib/maintenance';

type ReadinessStatus =
  | 'ready'
  | 'unauthorized'
  | 'missing_guild'
  | 'missing_service_role'
  | 'server_not_registered'
  | 'server_setup_required'
  | 'missing_bot_token'
  | 'bot_not_in_guild'
  | 'user_not_in_guild'
  | 'missing_user_profile'
  | 'discord_api_error';

type ReadinessResponse = {
  status: ReadinessStatus;
  blocking: boolean;
  guildId: string | null;
  guildName: string | null;
  isAdmin: boolean;
  canInviteBot: boolean;
  inviteUrl: string | null;
  debug?: {
    discordStatus?: number;
    reason?: string;
  };
};

const DISCORD_ADMINISTRATOR = BigInt(0x8);
const DISCORD_MANAGE_GUILD = BigInt(0x20);

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getBotInviteUrl = () => {
  if (process.env.NEXT_PUBLIC_DISCORD_BOT_INVITE) {
    return process.env.NEXT_PUBLIC_DISCORD_BOT_INVITE;
  }

  const appId = process.env.DISCORD_CLIENT_ID ?? process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!appId) return null;

  return `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=8&scope=bot%20applications.commands`;
};

const buildResponse = (params: Partial<ReadinessResponse> & Pick<ReadinessResponse, 'status'>): ReadinessResponse => {
  const inviteUrl = getBotInviteUrl();
  return {
    status: params.status,
    blocking: params.status !== 'ready',
    guildId: params.guildId ?? null,
    guildName: params.guildName ?? null,
    isAdmin: params.isAdmin ?? false,
    canInviteBot: params.canInviteBot ?? false,
    inviteUrl: params.inviteUrl ?? inviteUrl,
    debug: params.debug,
  };
};

const fetchWithRetry = async (url: string, init: RequestInit, retries = 2): Promise<Response> => {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (response.ok || ![429, 502, 503, 504].includes(response.status)) {
        return response;
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? Math.min(parseFloat(retryAfter) * 1000, 5000) : 1000;
        lastError = new Error(`Discord rate limited for ${url}`);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        return response;
      }
      lastError = new Error(`Discord returned ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  throw lastError;
};

const hasAdminLikePermission = (permissions: string | null | undefined) => {
  if (!permissions) return false;
  try {
    const bits = BigInt(permissions);
    return (bits & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR || (bits & DISCORD_MANAGE_GUILD) === DISCORD_MANAGE_GUILD;
  } catch {
    return false;
  }
};

type SupabaseOAuthReader = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { oauth_access_token?: string | null } | null }>;
      };
    };
  };
};

const resolveGuildAdminFromOAuth = async (
  supabaseClient: unknown,
  userId: string,
  guildId: string,
) => {
  try {
    const supabase = supabaseClient as SupabaseOAuthReader;

    const { data: userRow } = await (supabase.from('users') as unknown as {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { oauth_access_token?: string | null } | null }>;
        };
      };
    })
      .select('oauth_access_token')
      .eq('discord_id', userId)
      .maybeSingle();

    const userToken = userRow?.oauth_access_token ?? undefined;
    if (!userToken) return false;

    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${userToken}` },
      cache: 'no-store',
    });

    if (!guildsResponse.ok) return false;

    const guilds = (await guildsResponse.json()) as Array<{
      id: string;
      owner?: boolean;
      permissions?: string;
    }>;
    const guild = guilds.find((item) => item.id === guildId);
    if (!guild) return false;

    return Boolean(guild.owner) || hasAdminLikePermission(guild.permissions);
  } catch {
    return false;
  }
};

export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      buildResponse({ status: 'discord_api_error', debug: { reason: `maintenance: ${maintenance.reason ?? maintenance.key}` } }),
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json(
      buildResponse({
        status: 'unauthorized',
      }),
      { status: 401 },
    );
  }

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return NextResponse.json(
      buildResponse({
        status: 'missing_guild',
      }),
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      buildResponse({
        status: 'missing_service_role',
        guildId,
      }),
      { status: 500 },
    );
  }

  const { data: server } = await supabase
    .from('servers')
    .select('discord_id, name, is_setup, admin_role_id')
    .eq('discord_id', guildId)
    .maybeSingle();

  const nonOkStatus = (payload: Parameters<typeof buildResponse>[0]) =>
    NextResponse.json(buildResponse(payload), { status: 200 });

  if (!server) {
    const adminFromOAuth = await resolveGuildAdminFromOAuth(supabase, session.userId, guildId);
    return nonOkStatus({
      status: 'server_not_registered',
      guildId,
      isAdmin: adminFromOAuth,
      canInviteBot: adminFromOAuth,
    });
  }

  if (!server.is_setup) {
    const adminFromOAuth = await resolveGuildAdminFromOAuth(supabase, session.userId, guildId);
    return nonOkStatus({
      status: 'server_setup_required',
      guildId,
      guildName: server.name ?? null,
      isAdmin: adminFromOAuth,
      canInviteBot: adminFromOAuth,
    });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return nonOkStatus({
      status: 'missing_bot_token',
      guildId,
      guildName: server.name ?? null,
      isAdmin: false,
      canInviteBot: false,
    });
  }

  const guildResponse = await fetchWithRetry(`https://discord.com/api/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  });

  if (!guildResponse.ok) {
    if (guildResponse.status === 403 || guildResponse.status === 404) {
      return nonOkStatus({
        status: 'bot_not_in_guild',
        guildId,
        guildName: server.name ?? null,
        isAdmin: false,
        canInviteBot: false,
        debug: { discordStatus: guildResponse.status },
      });
    }

    return nonOkStatus({
      status: 'discord_api_error',
      guildId,
      guildName: server.name ?? null,
      isAdmin: false,
      canInviteBot: false,
      debug: { discordStatus: guildResponse.status, reason: 'guild_fetch_failed' },
    });
  }

  const guild = (await guildResponse.json()) as { name?: string; owner_id?: string };

  const memberResponse = await fetchWithRetry(`https://discord.com/api/guilds/${guildId}/members/${session.userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  });

  if (!memberResponse.ok) {
    if (memberResponse.status === 404) {
      return nonOkStatus({
        status: 'user_not_in_guild',
        guildId,
        guildName: guild.name ?? server.name ?? null,
        isAdmin: false,
        canInviteBot: false,
        debug: { discordStatus: memberResponse.status },
      });
    }

    return nonOkStatus({
      status: 'discord_api_error',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin: false,
      canInviteBot: false,
      debug: { discordStatus: memberResponse.status, reason: 'member_fetch_failed' },
    });
  }

  const member = (await memberResponse.json()) as { roles?: string[] };
  const roleIds = Array.isArray(member.roles) ? member.roles : [];
  const adminFromOAuth = await resolveGuildAdminFromOAuth(supabase, session.userId, guildId);
  const isAdmin =
    adminFromOAuth ||
    (Boolean(server.admin_role_id) && roleIds.includes(server.admin_role_id as string)) ||
    guild.owner_id === session.userId;

  // Kullanıcının bu sunucuda kayıtlı bir profilinin olup olmadığını kontrol et
  let memberProfile = null;
  let profileError = null;

  try {
    const result = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('guild_id', guildId)
      .eq('user_id', session.userId)
      .maybeSingle();

    memberProfile = result.data;
    profileError = result.error;

    if (!memberProfile) {
      // Global user profile tutkusu
      const globalResult = await supabase
        .from('member_profiles')
        .select('user_id')
        .eq('user_id', session.userId)
        .maybeSingle();
      memberProfile = globalResult.data;
      profileError = profileError || globalResult.error;

      if (memberProfile) {
        console.warn('[activity/readiness] user has global member profile, treating as ready for this guild', {
          userId: session.userId,
          guildId,
        });
      }
    }
  } catch (err) {
    console.warn('[activity/readiness] profile check failed', err);
  }

  if (profileError) {
    console.warn('[activity/readiness] profile check failed', profileError);
  }

  if (!memberProfile) {
    return nonOkStatus({
      status: 'missing_user_profile',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin,
      canInviteBot: isAdmin,
    });
  }

  return NextResponse.json(
    buildResponse({
      status: 'ready',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin,
      canInviteBot: isAdmin,
    }),
  );
}
