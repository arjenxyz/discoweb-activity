import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { addUserMari, insertMariLedger } from '@/lib/mariWallet';
import { checkMaintenance } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

type ActiveTaskAd = {
  id: string;
  server_name: string;
  server_description: string | null;
  server_icon: string | null;
  invite_url: string;
  target_guild_id: string | null;
  mari_reward: number | null;
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const isUserInDiscordGuild = async (guildId: string, userId: string): Promise<boolean> => {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;

  const response = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });

  return response.ok;
};

export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data, error } = await supabase
    .from('ads')
    .select('id,server_name,server_description,server_icon,invite_url,target_guild_id,mari_reward')
    .eq('active', true)
    .eq('task_enabled', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'failed_to_load_tasks' }, { status: 500 });
  }

  return NextResponse.json({ tasks: (data ?? []) as ActiveTaskAd[] });
}

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as { adId?: string };
  if (!payload.adId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: ad } = await supabase
    .from('ads')
    .select('id,target_guild_id,mari_reward,active,task_enabled')
    .eq('id', payload.adId)
    .maybeSingle() as { data: { id: string; target_guild_id: string | null; mari_reward: number | null; active: boolean; task_enabled: boolean } | null };

  if (!ad || !ad.active || !ad.task_enabled) {
    return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
  }

  if (!ad.target_guild_id) {
    return NextResponse.json({ error: 'task_not_configured' }, { status: 400 });
  }

  const isMember = await isUserInDiscordGuild(ad.target_guild_id, userId);
  if (!isMember) {
    return NextResponse.json({ error: 'join_required' }, { status: 400 });
  }

  const { data: existingClaim } = await supabase
    .from('mari_task_claims')
    .select('id')
    .eq('ad_id', ad.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingClaim) {
    return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
  }

  const reward = Number(ad.mari_reward ?? 1);
  if (!Number.isFinite(reward) || reward <= 0) {
    return NextResponse.json({ error: 'invalid_reward' }, { status: 400 });
  }

  const newMariBalance = await addUserMari(supabase, userId, reward);

  const { error: claimError } = await supabase.from('mari_task_claims').insert({
    ad_id: ad.id,
    user_id: userId,
    reward_mari: reward,
  });

  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
    }
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  await insertMariLedger(supabase, {
    userId,
    amount: reward,
    type: 'mari_task_reward',
    balanceAfter: newMariBalance,
    contextGuildId: selectedGuildId,
    metadata: { ad_id: ad.id, target_guild_id: ad.target_guild_id },
  });

  return NextResponse.json({
    ok: true,
    reward,
    mari_balance: newMariBalance,
  });
}
