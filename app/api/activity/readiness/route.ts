import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance, getMaintenanceFlags, isIncidentActive } from '@/lib/maintenance';
import { isLocalDevRequest, localDevReadiness } from '@/lib/localDev';
import { markActivityAccessRevoked, maybeSendActivityWelcome } from '@/lib/welcomeMail';

type ReadinessStatus =
  | 'ready'
  | 'unauthorized'
  | 'member_banned'
  | 'server_banned'
  | 'missing_guild'
  | 'missing_service_role'
  | 'server_not_registered'
  | 'server_setup_required'
  | 'missing_bot_token'
  | 'bot_not_in_guild'
  | 'bot_maintenance'
  | 'incident'
  | 'user_not_in_guild'
  | 'missing_user_profile'
  | 'missing_verify_role'
  | 'discord_api_error'
  | 'maintenance';

type ReadinessResponse = {
  status: ReadinessStatus;
  blocking: boolean;
  guildId: string | null;
  guildName: string | null;
  isAdmin: boolean;
  canInviteBot: boolean;
  inviteUrl: string | null;
  botInGuild?: boolean;
  debug?: Record<string, unknown>;
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
    botInGuild: params.botInGuild ?? false,
    debug: params.debug,
  };
};

const fetchWithRetry = async (url: string, init: RequestInit, retries = 2): Promise<Response> => {
  let lastError: unknown;
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

const checkGuildAdminWithToken = async (token: string, guildId: string): Promise<boolean> => {
  try {
    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const guilds = (await res.json()) as Array<{ id: string; owner?: boolean; permissions?: string }>;
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return false;
    return Boolean(guild.owner) || hasAdminLikePermission(guild.permissions);
  } catch {
    return false;
  }
};

const resolveGuildAdminFromOAuth = async (
  supabaseClient: unknown,
  userId: string,
  guildId: string,
  requestBearerToken?: string,
) => {
  try {
    // Önce request'ten gelen token'ı dene (en güncel)
    if (requestBearerToken) {
      const result = await checkGuildAdminWithToken(requestBearerToken, guildId);
      if (result) return true;
    }

    // Fallback: DB'deki token
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

    return await checkGuildAdminWithToken(userToken, guildId);
  } catch {
    return false;
  }
};

export async function GET(request: Request) {
  if (isLocalDevRequest(request)) {
    return NextResponse.json(localDevReadiness);
  }

  // Emergency stop — never bypassed (including developers).
  if (await isIncidentActive()) {
    return NextResponse.json(
      buildResponse({
        status: 'incident',
        debug: { key: 'incident' },
      }),
      { status: 503 },
    );
  }

  const maintenance = await checkMaintenance(['site', 'activity'], request);
  if (maintenance.blocked) {
    return NextResponse.json(
      buildResponse({
        status: 'maintenance',
        debug: {
          key: maintenance.key,
          reason: maintenance.reason,
        },
      }),
      { status: 503 },
    );
  }

  // Bot flag: always block entry (no developer bypass — gate must match other readiness screens).
  const flagData = await getMaintenanceFlags();
  if (flagData?.flags.bot?.is_active) {
    return NextResponse.json(
      buildResponse({
        status: 'bot_maintenance',
        debug: {
          key: 'bot',
          reason: flagData.flags.bot.reason,
        },
      }),
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

  // Request'teki bearer token (discord_bearer_token from localStorage)
  const authHeader = request.headers.get('Authorization');
  const requestBearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

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
        debug: { missingVars: ['SUPABASE_SERVICE_ROLE_KEY'], env: process.env.NODE_ENV },
      }),
      { status: 500 },
    );
  }

  const nonOkStatus = (payload: Parameters<typeof buildResponse>[0]) =>
    NextResponse.json(buildResponse(payload), { status: 200 });

  // Bot kontrolü her şeyden önce
  const nowIso = new Date().toISOString();

  const { data: memberBan } = await supabase
    .from('member_bans')
    .select('id, guild_id, reason, expires_at')
    .eq('user_id', session.userId)
    .eq('is_active', true)
    .or(`guild_id.eq.${guildId},guild_id.is.null`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberBan) {
    return nonOkStatus({
      status: 'member_banned',
      guildId,
      debug: {
        banId: memberBan.id,
        reason: memberBan.reason ?? null,
        expiresAt: memberBan.expires_at ?? null,
        scope: memberBan.guild_id ? 'guild' : 'global',
      },
    });
  }

  const { data: serverBan } = await supabase
    .from('server_bans')
    .select('id, reason, expires_at')
    .eq('guild_id', guildId)
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (serverBan) {
    return nonOkStatus({
      status: 'server_banned',
      guildId,
      debug: {
        banId: serverBan.id,
        reason: serverBan.reason ?? null,
        expiresAt: serverBan.expires_at ?? null,
      },
    });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return nonOkStatus({ status: 'missing_bot_token', guildId, debug: { missingVars: ['DISCORD_BOT_TOKEN'], env: process.env.NODE_ENV } });
  }

  const guildResponse = await fetchWithRetry(`https://discord.com/api/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${botToken}` },
    cache: 'no-store',
  });

  if (!guildResponse.ok) {
    console.error('[readiness] guild fetch failed', { guildId, status: guildResponse.status });
    if (guildResponse.status === 403 || guildResponse.status === 404) {
      const adminFromOAuth = await resolveGuildAdminFromOAuth(supabase, session.userId, guildId, requestBearerToken);
      return nonOkStatus({
        status: 'bot_not_in_guild',
        guildId,
        isAdmin: adminFromOAuth,
        canInviteBot: adminFromOAuth,
        botInGuild: false,
        debug: { discordStatus: guildResponse.status, reason: 'guild_fetch_failed', endpoint: 'GET /guilds/:id', retried: true },
      });
    }

    return nonOkStatus({
      status: 'discord_api_error',
      guildId,
      isAdmin: false,
      canInviteBot: false,
      debug: { discordStatus: guildResponse.status, reason: 'guild_fetch_failed', endpoint: 'GET /guilds/:id', retried: true },
    });
  }

  const guild = (await guildResponse.json()) as { name?: string; owner_id?: string };

  // Bot sunucudaysa: DB sunucu kaydını kontrol et
  const { data: server } = await supabase
    .from('servers')
    .select('discord_id, name, is_setup, admin_role_id, verify_role_id')
    .eq('discord_id', guildId)
    .maybeSingle();

  const isOwnerViaBot = guild.owner_id === session.userId;

  if (!server) {
    const adminFromOAuth = isOwnerViaBot || await resolveGuildAdminFromOAuth(supabase, session.userId, guildId, requestBearerToken);
    return nonOkStatus({
      status: 'server_not_registered',
      guildId,
      guildName: guild.name ?? null,
      isAdmin: adminFromOAuth,
      canInviteBot: adminFromOAuth,
      botInGuild: true,
      debug: { guildOwner: guild.owner_id, guildName: guild.name },
    });
  }

  if (!server.is_setup) {
    const adminFromOAuth = isOwnerViaBot || await resolveGuildAdminFromOAuth(supabase, session.userId, guildId, requestBearerToken);
    const missingFields = [
      !server.admin_role_id && 'admin_role_id',
      !server.verify_role_id && 'verify_role_id',
    ].filter(Boolean);
    return nonOkStatus({
      status: 'server_setup_required',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin: adminFromOAuth,
      canInviteBot: adminFromOAuth,
      botInGuild: true,
      debug: { isSetup: false, missingFields },
    });
  }

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
        debug: { discordStatus: memberResponse.status, endpoint: 'GET /guilds/:id/members/:userId' },
      });
    }

    return nonOkStatus({
      status: 'discord_api_error',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin: false,
      canInviteBot: false,
      debug: { discordStatus: memberResponse.status, reason: 'member_fetch_failed', endpoint: 'GET /guilds/:id/members/:userId', retried: true },
    });
  }

  const member = (await memberResponse.json()) as { roles?: string[] };
  const roleIds = Array.isArray(member.roles) ? member.roles : [];
  const adminFromOAuth = await resolveGuildAdminFromOAuth(supabase, session.userId, guildId, requestBearerToken);
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

  // Verify rolü kontrolü: profil var ama verify rolü yoksa
  const verifyRoleId = (server as { verify_role_id?: string | null }).verify_role_id;
  if (verifyRoleId && !roleIds.includes(verifyRoleId)) {
    try {
      await markActivityAccessRevoked(supabase, guildId, session.userId);
    } catch (err) {
      console.warn('[activity/readiness] mark access revoked failed', err);
    }
    return nonOkStatus({
      status: 'missing_verify_role',
      guildId,
      guildName: guild.name ?? server.name ?? null,
      isAdmin,
      canInviteBot: isAdmin,
    });
  }

  const guildName = guild.name ?? server.name ?? null;
  try {
    await maybeSendActivityWelcome(supabase, {
      guildId,
      userId: session.userId,
      guildName,
    });
  } catch (err) {
    console.warn('[activity/readiness] welcome mail failed', err);
  }

  return NextResponse.json(
    buildResponse({
      status: 'ready',
      guildId,
      guildName,
      isAdmin,
      canInviteBot: isAdmin,
    }),
  );
}
