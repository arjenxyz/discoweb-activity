import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { getSessionUserId } from '@/lib/auth';
import { isLocalDev } from '@/lib/localDev';

const TIMEZONE_OFFSET_MINUTES = Number(process.env.PAPEL_TIMEZONE_OFFSET || 180);

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || null;
};

export async function GET() {
  if (await isLocalDev()) {
    const now = new Date().toISOString();
    return NextResponse.json({
      orders: [
        {
          id: 'order-vip-1',
          amount: 500,
          status: 'paid',
          created_at: now,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          failure_reason: null,
          item_title: 'VIP Rolü',
          role_id: 'role-vip',
          duration_days: 30,
          can_refund: false,
        },
        {
          id: 'order-pending-1',
          amount: 1000,
          status: 'pending',
          created_at: now,
          expires_at: null,
          failure_reason: null,
          item_title: 'Premium Rolü',
          role_id: 'role-premium',
          duration_days: 30,
          can_refund: true,
        },
      ],
    });
  }

  const maintenance = await checkMaintenance(['site', 'transactions']);
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

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: orders, error } = await supabase
    .from('store_orders')
    .select('id,amount,status,created_at,expires_at,failure_reason,item_title,role_id,duration_days,store_items(title)')
    .eq('server_id', server.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const now = new Date();
  const localMs = now.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000;
  const local = new Date(localMs);
  const todayStartLocal = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));

  const mapped = (orders ?? []).map((order) => {
    const createdAt = new Date(order.created_at);
    const canRefund = order.status === 'pending' && createdAt >= todayStartLocal;
    const itemTitle =
      'store_items' in order && order.store_items && typeof order.store_items === 'object'
        ? (order.store_items as { title?: string | null }).title ?? null
        : null;
    return { ...order, can_refund: canRefund, item_title: order.item_title ?? itemTitle };
  });

  return NextResponse.json({ orders: mapped });
}
