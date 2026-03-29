import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || null;
};

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) {
      return session.response;
    }
    const userId = session.userId;

    const { code, itemId, cartTotal } = await request.json();
    if (!code || typeof code !== 'string' || !itemId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = getSupabase();
    const selectedGuildId = await getSelectedGuildId();

    // DEBUG: Log incoming discount validation attempt (temporary)
    console.log('[discount-debug] Validating discount code', { code, itemId, selectedGuildId });

    // Get server ID — with fallback like /api/member/coupons
    let server: { id: string } | null = null;
    if (selectedGuildId) {
      const { data: byDiscord } = await supabase
        .from('servers')
        .select('id')
        .eq('discord_id', selectedGuildId)
        .maybeSingle();
      server = byDiscord as { id: string } | null;
    }
    if (!server) {
      const { data: first } = await supabase
        .from('servers')
        .select('id')
        .limit(1)
        .maybeSingle();
      server = first as { id: string } | null;
    }
    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Check if discount code exists and is valid
    const { data: discount, error: discountError } = await supabase
      .from('store_discounts')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', code.toUpperCase())
      .eq('status', 'active')
      .single();

    if (discountError || !discount) {
      // Check if code exists on another server to provide clearer message
      const { data: other, error: otherErr } = await supabase
        .from('store_discounts')
        .select('id, server_id')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (other && !otherErr) {
        return NextResponse.json({ error: 'wrong_server' }, { status: 400 });
      }

      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    // Check expiration
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    // Check usage limit
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ error: 'usage_limit_exceeded' }, { status: 400 });
    }

    // check per-user usage limit
    const { data: usageRows } = await supabase
      .from('discount_usages')
      .select('id')
      .eq('discount_id', discount.id)
      .eq('user_id', userId);

    const userUsageCount = usageRows ? usageRows.length : 0;
    const perUserLimit = discount.per_user_limit ?? 1;

    if (userUsageCount >= perUserLimit) {
      return NextResponse.json({ ok: false, error: 'ALREADY_USED' }, { status: 400 });
    }

    // Determine cart total: prefer explicit cartTotal from client, fallback to single item price
    let totalAmount = 0;
    if (typeof cartTotal === 'number' && !isNaN(cartTotal)) {
      totalAmount = Number(cartTotal);
    } else {
      // Get item details
      const { data: item } = await supabase
        .from('store_items')
        .select('*')
        .eq('id', itemId)
        .eq('server_id', server.id)
        .single();

      if (!item) {
        return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
      }

      totalAmount = Number(item.price || 0);
    }

    const minSpend = Number(discount.min_spend || 0);
    if (minSpend > 0 && totalAmount < minSpend) {
      const remaining = Number((minSpend - totalAmount).toFixed(2));
      return NextResponse.json({ error: 'MIN_SPEND_NOT_MET', remaining, minSpend }, { status: 400 });
    }

    // Calculate discounted price for totalAmount
    const discountAmount = (totalAmount * (Number(discount.percent) || 0)) / 100;
    const finalPrice = totalAmount - discountAmount;

    return NextResponse.json({
      success: true,
      discount: {
        id: discount.id,
        code: discount.code,
        percent: discount.percent,
        originalPrice: totalAmount,
        discountAmount,
        finalPrice,
        userUsageCount,
        perUserLimit,
      },
    });

  } catch (error) {
    console.error('Discount validation error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
