import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';
import { cleanupExpiredRolesForUser } from '@/lib/roleCleanup';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { getSelectedGuildId } from '@/lib/guild';

type PapelRow = { user_id: string; balance: number | null };

type DiscordMemberInfo = {
  userId: string;
  avatarUrl: string;
  nickname: string | null;
  displayName: string | null;
  username: string;
};

type DailyStatRow = { message_count: number | null; voice_minutes: number | null };

type PerkRow = {
  role_id: string;
  item_title: string | null;
  applied_at: string | null;
  expires_at: string | null;
};

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Development mode'da da gerçek Supabase verilerini çek
  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });
  }

  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [{ data: serverTotals }, { data: userTotals }] = await Promise.all([
    supabase
      .from('server_overview_stats')
      .select('total_messages,total_voice_minutes')
      .eq('guild_id', selectedGuildId)
      .maybeSingle(),
    supabase
      .from('member_overview_stats')
      .select('total_messages,total_voice_minutes')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  let joinedAt: string | null = null;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  let memberRoles: string[] = [];
  let boosterSince: string | null = null;
  let isBooster = false;
  if (botToken) {
    const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (memberResponse.ok) {
      const member = (await memberResponse.json()) as { joined_at?: string; roles?: string[]; premium_since?: string | null };
      joinedAt = member.joined_at ?? null;
      memberRoles = member.roles ?? [];
      boosterSince = member.premium_since ?? null;
      isBooster = Boolean(boosterSince);
    }
  }

  // Papel leaderboard: top 30 and provided current user rank
  let papelLeaderboard: Array<{ userId: string; avatarUrl: string; nickname: string | null; displayName: string | null; username: string; papel: number; isCurrentUser: boolean }> = [];

  // Parse offset and limit from query params
  const searchParams = new URL(request.url).searchParams;
  const offset = Number(searchParams.get('offset') ?? 0);
  const limit = Number(searchParams.get('limit') ?? 10);

  // Fetch paged leaderboard
  const { data: papelRows, count: totalCount } = await supabase
    .from('member_wallets')
    .select('user_id,balance', { count: 'exact' })
    .eq('guild_id', selectedGuildId)
    .order('balance', { ascending: false })
    .order('user_id', { ascending: true })
    .range(offset, offset + limit - 1);
  const papelRowsTyped = papelRows as PapelRow[] | null;

  const fetchDiscordUser = async (uid: string) => {
    let avatarUrl = '';
    let username = uid;

    try {
      const userRes = await fetch(`https://discord.com/api/users/${uid}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!userRes.ok) return { avatarUrl, username };

      const user = await userRes.json();
      avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.id) % 5}.png`;
      username = user.username || uid;
    } catch {
      // ignore fetch errors
    }

    return { avatarUrl, username };
  };

  const fetchMember = async (uid: string) => {
    let avatarUrl = '';
    let nickname: string | null = null;
    let displayName: string | null = null;
    let username = '';

    if (!botToken) {
      return { userId: uid, avatarUrl, nickname, displayName, username };
    }

    try {
      const memberRes = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${uid}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (memberRes.ok) {
        const member = await memberRes.json();
        avatarUrl = member.user.avatar
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=64`
          : `https://cdn.discordapp.com/embed/avatars/${Number(member.user.id) % 5}.png`;
        nickname = member.nick ?? null;
        displayName = member.user.global_name ?? null;
        username = member.user.username || uid;
      } else {
        // If the user left the guild or we can't access guild member info, fall back to the global user object.
        const userInfo = await fetchDiscordUser(uid);
        avatarUrl = userInfo.avatarUrl;
        username = userInfo.username;
      }
    } catch {
      // ignore fetch errors, dönen roster’da boş kalacak
      username = uid;
    }

    return { userId: uid, avatarUrl, nickname, displayName, username };
  };

  if (papelRowsTyped && papelRowsTyped.length) {
    // Discord API’den hızla kullanıcı bilgisi almak için paralel istekler (kümeleme)
    const concurrency = 30;
    const discordMembers: DiscordMemberInfo[] = [];

    for (let i = 0; i < (papelRowsTyped.length ?? 0); i += concurrency) {
      const batch = papelRowsTyped.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((row) => fetchMember(row.user_id)));
      discordMembers.push(...results);
    }

    papelLeaderboard = papelRowsTyped.map((row, idx) => {
      const info = discordMembers[idx] || ({} as DiscordMemberInfo);
      return {
        userId: row.user_id,
        avatarUrl: info.avatarUrl,
        nickname: info.nickname,
        displayName: info.displayName,
        username: info.username,
        papel: Number(row.balance ?? 0),
        isCurrentUser: row.user_id === userId,
      };
    });
  }

  // Ensure we can show the current user's rank even if they're not in the top 30.
  const { data: walletRow } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .maybeSingle();
  const currentUserPapel = Number(walletRow?.balance ?? 0);

  let currentUserAvatar = '';
  let currentUserNickname: string | null = null;
  let currentUserDisplayName: string | null = null;
  let currentUserUsername = '';

  if (botToken) {
    const memberInfo = await fetchMember(userId);
    currentUserAvatar = memberInfo.avatarUrl;
    currentUserNickname = memberInfo.nickname;
    currentUserDisplayName = memberInfo.displayName;
    currentUserUsername = memberInfo.username;
  }

  const currentUserEntry = {
    userId,
    avatarUrl: currentUserAvatar,
    nickname: currentUserNickname,
    displayName: currentUserDisplayName,
    username: currentUserUsername,
    papel: currentUserPapel,
    isCurrentUser: true,
  };

  // Rank calculation: how many users have a strictly higher balance than current user.
  const { count: higherCount } = await supabase
    .from('member_wallets')
    .select('user_id', { count: 'exact', head: true })
    .eq('guild_id', selectedGuildId)
    .gt('balance', currentUserPapel);
  const currentUserRank = (higherCount ?? 0) + 1;

  // Don't push current user into the paged leaderboard array — it messes up
  // ordering and counts. The client uses `currentUser` + `currentUserRank`
  // separately to show the footer.

  // load server record to get verify_role_id, tag/booster config and internal server id
  const { data: serverRow } = await supabase
    .from('servers')
    .select('id,verify_role_id,tag_bonus_message,tag_bonus_voice,booster_bonus_message,booster_bonus_voice,tag_id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  // compute last 24h stats (approx by stat_date >= today-1)
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data: last24 } = await supabase
    .from('member_daily_stats')
    .select('message_count,voice_minutes', { count: 'exact' })
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .gte('stat_date', dayAgo);

  const statsRows = (last24 ?? []) as DailyStatRow[];
  const messagesLast24h = statsRows.reduce((s, r) => s + Number(r.message_count ?? 0), 0);
  const voiceMinutesLast24h = statsRows.reduce((s, r) => s + Number(r.voice_minutes ?? 0), 0);

  // determine verified role and when it was first applied (if any)
  let hasVerifyRole = false;
  let verifiedSince: string | null = null;
  if (serverRow?.verify_role_id) {
    hasVerifyRole = memberRoles.includes(serverRow.verify_role_id);

    // look for a paid store_order that applied the verify role
    const { data: verifyOrders } = await supabase
      .from('store_orders')
      .select('applied_at')
      .eq('user_id', userId)
      .eq('server_id', serverRow.id)
      .eq('role_id', serverRow.verify_role_id)
      .eq('status', 'paid')
      .order('applied_at', { ascending: true })
      .limit(1);
    if (verifyOrders && verifyOrders.length) {
      verifiedSince = verifyOrders[0].applied_at ?? null;
    }
  }

  // totals since verifiedSince (if present)
  let totalsSinceVerified: { messages: number; voice_minutes: number } | null = null;
  if (verifiedSince) {
    const sinceDate = new Date(verifiedSince).toISOString().slice(0, 10);
    const { data: sinceRows } = await supabase
      .from('member_daily_stats')
      .select('message_count,voice_minutes')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .gte('stat_date', sinceDate);
    const sinceRowsTyped = (sinceRows ?? []) as DailyStatRow[];
    const msgs = sinceRowsTyped.reduce((s, r) => s + Number(r.message_count ?? 0), 0);
    const vmins = sinceRowsTyped.reduce((s, r) => s + Number(r.voice_minutes ?? 0), 0);
    totalsSinceVerified = { messages: msgs, voice_minutes: vmins };
  }

  // active perks (paid store_orders currently applied)
  let activePerks: Array<{ role_id: string; item_title: string | null; applied_at: string | null; expires_at: string | null }> = [];
  if (serverRow?.id) {
    const { data: perks } = await supabase
      .from('store_orders')
      .select('role_id,item_title,applied_at,expires_at')
      .eq('user_id', userId)
      .eq('server_id', serverRow.id)
      .eq('status', 'paid')
      .not('applied_at', 'is', null)
      .order('applied_at', { ascending: false });
    if (perks) {
      const now = Date.now();
      activePerks = (perks as PerkRow[])
        .filter((p) => !p.expires_at || new Date(p.expires_at).getTime() > now)
        .map((p) => ({ role_id: p.role_id, item_title: p.item_title ?? null, applied_at: p.applied_at ?? null, expires_at: p.expires_at ?? null }));
    }
  }

  // tag info from member_profiles (bot writes has_tag/is_booster directly)
  let hasTag = false;
  let tagGrantedAt: string | null = null;
  if (selectedGuildId) {
    const { data: profileRow } = await supabase
      .from('member_profiles')
      .select('tag_granted_at,has_tag,is_booster,booster_since')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();
    if (profileRow) {
      tagGrantedAt = profileRow.tag_granted_at ?? null;
      // Prefer the bot-written has_tag field, fall back to tag_granted_at
      hasTag = profileRow.has_tag === true || profileRow.has_tag === 'true' || Boolean(tagGrantedAt);
      // Also use bot-written boost status as fallback
      if (!isBooster && (profileRow.is_booster === true || profileRow.is_booster === 'true')) {
        isBooster = true;
        boosterSince = profileRow.booster_since ?? boosterSince;
      }
    }
  }

  // Süresi dolmuş rolleri arka planda temizle (bot çevrimdışı olsa bile)
  if (serverRow?.id) {
    cleanupExpiredRolesForUser(supabase as SupabaseClient, serverRow.id, selectedGuildId, userId, botToken).catch(() => {});
  }

  return NextResponse.json({
    joinedAt,
    serverMessages: Number(serverTotals?.total_messages ?? 0),
    serverVoiceMinutes: Number(serverTotals?.total_voice_minutes ?? 0),
    userMessages: Number(userTotals?.total_messages ?? 0),
    userVoiceMinutes: Number(userTotals?.total_voice_minutes ?? 0),
    // tag / booster config & status
    tagBonusMessage: Number(serverRow?.tag_bonus_message ?? 0),
    tagBonusVoice: Number(serverRow?.tag_bonus_voice ?? 0),
    boosterBonusMessage: Number(serverRow?.booster_bonus_message ?? 0),
    boosterBonusVoice: Number(serverRow?.booster_bonus_voice ?? 0),
    hasTag,
    tagGrantedAt,
    isBooster,
    boosterSince,
    hasVerifyRole,
    verifiedSince,
    totalsSinceVerified,
    messagesLast24h,
    voiceMinutesLast24h,
    activePerks,
    papelLeaderboard,
    currentUserRank,
    currentUser: currentUserEntry,
    totalLeaderboardCount: totalCount ?? 0,
  });
}
