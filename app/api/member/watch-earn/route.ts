import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance } from '@/lib/maintenance';
import {
  isLocalDevRequest,
  getLocalDevWatchEarnTasks,
  claimLocalDevWatchEarn,
} from '@/lib/localDev';

export const dynamic = 'force-dynamic';

type WatchEarnTaskRow = {
  id: string;
  title: string;
  logo_text: string;
  sponsor: string;
  reward_papel: number;
  multiplier_label: string | null;
  banner_url: string;
  video_url: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  if (isLocalDevRequest(request)) {
    return NextResponse.json({ tasks: getLocalDevWatchEarnTasks() });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('watch_earn_tasks')
    .select(
      'id,title,logo_text,sponsor,reward_papel,multiplier_label,banner_url,video_url,starts_at,ends_at,created_at',
    )
    .eq('active', true)
    .lte('starts_at', nowIso)
    .gte('ends_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'failed_to_load_tasks' }, { status: 500 });
  }

  const tasks = (data ?? []) as WatchEarnTaskRow[];
  const taskIds = tasks.map((t) => t.id);

  let claimedIds = new Set<string>();
  let claimedAtMap = new Map<string, string>();

  if (taskIds.length > 0) {
    const { data: claims } = await supabase
      .from('watch_earn_claims')
      .select('task_id,claimed_at')
      .eq('user_id', session.userId)
      .in('task_id', taskIds);

    for (const claim of claims ?? []) {
      claimedIds.add(claim.task_id as string);
      claimedAtMap.set(claim.task_id as string, claim.claimed_at as string);
    }
  }

  const mapped = tasks.map((task) => {
    const banner = task.banner_url.startsWith('http')
      ? task.banner_url.replace(
          /^https?:\/\/(?:[a-z0-9-]+\.)?supabase\.co\/storage\/v1\/object\/public\//i,
          '/cdn/',
        )
      : task.banner_url;
    const videoUrl = task.video_url.startsWith('http')
      ? task.video_url.replace(
          /^https?:\/\/(?:[a-z0-9-]+\.)?supabase\.co\/storage\/v1\/object\/public\//i,
          '/cdn/',
        )
      : task.video_url;

    return {
      id: task.id,
      title: task.title,
      logoText: task.logo_text,
      sponsor: task.sponsor,
      reward: Number(task.reward_papel),
      multiplier: task.multiplier_label,
      banner,
      videoUrl,
      startsAt: task.starts_at,
      endsAt: task.ends_at,
      claimed: claimedIds.has(task.id),
      claimedAt: claimedAtMap.get(task.id) ?? null,
      createdAt: task.created_at,
    };
  });

  // Yeni görevler üstte; alınmış olanlar alta
  mapped.sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ tasks: mapped });
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

  const payload = (await request.json().catch(() => ({}))) as { taskId?: string };
  if (!payload.taskId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  if (isLocalDevRequest(request)) {
    const result = claimLocalDevWatchEarn(payload.taskId);
    if (!result.ok) {
      const status = result.error === 'already_claimed' ? 409 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({
      ok: true,
      reward: result.reward,
      balance: result.balance,
      claimed_at: new Date().toISOString(),
    });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const selectedGuildId = await getSelectedGuildId(request);
  if (!selectedGuildId) {
    return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { data: task } = await supabase
    .from('watch_earn_tasks')
    .select('id,reward_papel,active,starts_at,ends_at')
    .eq('id', payload.taskId)
    .maybeSingle();

  if (
    !task ||
    !task.active ||
    new Date(task.starts_at as string) > new Date(nowIso) ||
    new Date(task.ends_at as string) < new Date(nowIso)
  ) {
    return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
  }

  const { data: existingClaim } = await supabase
    .from('watch_earn_claims')
    .select('id')
    .eq('task_id', task.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingClaim) {
    return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
  }

  const reward = Number(task.reward_papel ?? 0);
  if (!Number.isFinite(reward) || reward < 0) {
    return NextResponse.json({ error: 'invalid_reward' }, { status: 400 });
  }

  const { data: walletRow } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentBalance = Number((walletRow as { balance?: number } | null)?.balance ?? 0);
  const newBalance = Number((currentBalance + reward).toFixed(2));

  const { error: claimError } = await supabase.from('watch_earn_claims').insert({
    task_id: task.id,
    user_id: userId,
    guild_id: selectedGuildId,
    reward_papel: reward,
  });

  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
    }
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  if (reward > 0) {
    const { error: walletError } = await supabase.from('member_wallets').upsert(
      {
        guild_id: selectedGuildId,
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'guild_id,user_id' },
    );

    if (walletError) {
      // Claim kaydı yazıldı ama bakiye güncellenemedi — kullanıcıyı yanıltma
      return NextResponse.json({ error: 'wallet_update_failed' }, { status: 500 });
    }

    const { error: ledgerError } = await supabase.from('wallet_ledger').insert({
      guild_id: selectedGuildId,
      user_id: userId,
      amount: reward,
      type: 'watch_earn_reward',
      balance_after: newBalance,
      metadata: { source: 'watch_earn', task_id: task.id },
    });

    if (ledgerError) {
      console.warn('[watch-earn] ledger insert failed:', ledgerError.message);
    }
  }

  return NextResponse.json({
    ok: true,
    reward,
    balance: newBalance,
    claimed_at: new Date().toISOString(),
  });
}
