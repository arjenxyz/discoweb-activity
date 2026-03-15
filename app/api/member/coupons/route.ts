import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSessionUserId } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';

const getSelectedGuildId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const resolveServerId = async (supabase: SupabaseClient) => {
  const selectedGuildId = await getSelectedGuildId();

  const { data: byDiscord } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if ((byDiscord as { id?: string } | null)?.id) return (byDiscord as { id?: string }).id;

  const { data: bySlug } = await supabase
    .from('servers')
    .select('id')
    .eq('slug', 'default')
    .maybeSingle();

  return (bySlug as { id?: string } | null)?.id ?? null;
};

export async function GET() {
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

    const cookieStore = await cookies();
    const userId = await getSessionUserId();

    const serverId = await resolveServerId(supabase);
    if (!serverId) {
      console.error('member/coupons: server not found.', { selectedGuildId: await getSelectedGuildId() });
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
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
