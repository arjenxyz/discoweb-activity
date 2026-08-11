import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserId, requireSessionUser } from '@/lib/auth';
import { isLocalDev, localDevNotifications } from '@/lib/localDev';

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || null; // Fallback to default
};


const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isVerifiedUser = async (supabase: any, userId: string | null) => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!supabase || !botToken || !userId) {
    return false;
  }

  const selectedGuildId = await getSelectedGuildId();
  const { data: server } = await supabase
    .from('servers')
    .select('verify_role_id')
    .eq('discord_id', selectedGuildId)
    .maybeSingle();

  const verifyRoleId = (server as { verify_role_id: string | null } | null)?.verify_role_id ?? null;
  if (!verifyRoleId) {
    return false;
  }

  const memberResponse = await fetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  if (!memberResponse.ok) {
    return false;
  }

  const member = (await memberResponse.json()) as { roles: string[] };
  return member.roles.includes(verifyRoleId);
};

export async function GET() {
  if (await isLocalDev()) {
    return NextResponse.json(localDevNotifications);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const userId = await getSessionUserId();
  const selectedGuildId = await getSelectedGuildId();

  if (!selectedGuildId) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Allow logged-in users to fetch their personal notifications even if not verified.
  // Require verification only for anonymous or server-wide access.
  const isVerified = await isVerifiedUser(supabase, userId ?? null);
  if (!userId && !isVerified) {
    return NextResponse.json({ error: 'verify_required' }, { status: 403 });
  }

  // Get notifications from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,type,created_at,author_name,author_avatar_url,details_url,image_url')
    .eq('guild_id', selectedGuildId)
    .eq('status', 'published')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .or(userId ? `target_user_id.is.null,target_user_id.eq.${userId}` : 'target_user_id.is.null')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const notifications = data ?? [];
  if (!userId || notifications.length === 0) {
    return NextResponse.json(notifications.map((item) => ({ ...item, is_read: !userId ? true : false })));
  }

  const ids = notifications.map((item) => item.id);
  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId)
    .in('notification_id', ids);

  const readSet = new Set((reads ?? []).map((entry) => entry.notification_id));
  const mapped = notifications.map((item) => ({ ...item, is_read: readSet.has(item.id) }));

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;

  // Allow marking as read for the user even if not verified
  // (only allow marking notifications that belong to the current user)
  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  await (supabase.from('notification_reads') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      notification_id: payload.id,
      user_id: userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: 'notification_id,user_id' },
  );

  return NextResponse.json({ status: 'ok' });
}
