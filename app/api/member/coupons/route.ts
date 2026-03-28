import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSessionUserId } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const resolveServerId = async (supabase: SupabaseClient, guildId: string) => {
  // Try with discord_id (with or without is_setup)
  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .maybeSingle();

  if ((byDiscord as { id?: string } | null)?.id) return (byDiscord as { id?: string }).id;

  // Fallback: first server in DB
  const { data: first } = await supabase
    .from('servers')
    .select('id')
    .limit(1)
    .maybeSingle();

  return (first as { id?: string } | null)?.id ?? null;
};

// Production için fallback server ID
const FALLBACK_SERVER_ID = 'default-server-id';

export async function GET(request: Request) {
  try {
    // Development mode bypass for Activity
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        coupons: [
          {
            id: 'welcome10',
            code: 'WELCOME10',
            discount: 10,
            description: 'Hoş geldin indirim! İlk alışverişinde %10 indirim',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            used: false,
            maxUses: 1,
            type: 'percentage'
          },
          {
            id: 'weekend20',
            code: 'WEEKEND20',
            discount: 20,
            description: 'Hafta sonu özel! %20 indirim',
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            used: false,
            maxUses: 1,
            type: 'percentage'
          }
        ]
      });
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.error('member/coupons: missing Supabase credentials');
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      console.warn('member/coupons: no guild specified, returning empty coupon list');
      return NextResponse.json([]);
    }

    const serverId = await resolveServerId(supabase, selectedGuildId);
    if (!serverId) {
      console.error('member/coupons: server not found.', { selectedGuildId });
      // If the server is not configured in the database, return an empty coupon list
      // rather than failing the entire request.
      return NextResponse.json([]);
    }

  // Fetch active discounts for the server
  const nowIso = new Date().toISOString();
  const { data: discounts, error: discountsError } = await supabase
    .from('store_discounts')
    .select('id,code,percent,max_uses,used_count,status,expires_at,is_welcome,is_special,per_user_limit')
    .eq('server_id', serverId)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  if (discountsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  let filtered = discounts ?? [];

  // Filter out discounts that reached their max uses
  filtered = filtered.filter((d: any) => !d.max_uses || d.used_count < d.max_uses);

  // Kullanıcı bazlı kullanım sayılarını hesapla ve limiti dolmuş olanları filtrele
  const mapped = await Promise.all((filtered as any[]).map(async (d) => {
    let userUsageCount = 0;
    const perUserLimit = d.per_user_limit ?? 1;

    if (userId) {
      const { data: userUsages } = await supabase
        .from('discount_usages')
        .select('id')
        .eq('discount_id', d.id)
        .eq('user_id', userId);

      userUsageCount = userUsages ? userUsages.length : 0;
    }

    return {
      id: d.id,
      code: d.code,
      percent: Number(d.percent),
      max_uses: d.max_uses ?? null,
      used_count: d.used_count ?? 0,
      userUsageCount,
      perUserLimit,
      expires_at: d.expires_at ?? null,
      is_welcome: d.is_welcome ?? false,
      is_special: d.is_special ?? false,
    };
  }));

  // Kullanıcının limiti dolmuş kuponları filtrele (userUsageCount >= perUserLimit ise kaldır)
  const result = mapped.filter((d) => d.userUsageCount < d.perUserLimit);

  return NextResponse.json(result);
  } catch (err) {
    console.error('member/coupons: unhandled error', err);
    const body: any = { error: 'unhandled_exception' };
    if (process.env.NODE_ENV !== 'production') {
      body.details = String(err);
      if (err instanceof Error) body.stack = err.stack;
    }
    return NextResponse.json(body, { status: 500 });
  }
}
