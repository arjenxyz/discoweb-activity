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

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    const supabase = getSupabase();
    const selectedGuildId = await getSelectedGuildId();

    // Get server ID
    const { data: server } = await supabase
      .from('servers')
      .select('id')
      .eq('discord_id', selectedGuildId)
      .maybeSingle();

    if (!server) {
      return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
    }

    // Check if promotion code exists and is valid
    const { data: promotion, error: promoError } = await supabase
      .from('promotions')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', code.toUpperCase())
      .eq('status', 'active')
      .is('deleted_at', null)
      .maybeSingle();

    if (promoError || !promotion) {
      const { data: otherPromo } = await supabase
        .from('promotions')
        .select('id, server_id')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (otherPromo) {
        return NextResponse.json({ error: 'wrong_server' }, { status: 400 });
      }

      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    if (promotion.expires_at && new Date(promotion.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired' }, { status: 400 });
    }

    if (promotion.max_uses && promotion.used_count >= promotion.max_uses) {
      return NextResponse.json({ error: 'usage_limit_exceeded' }, { status: 400 });
    }

    const { data: existingPromotionUsage } = await supabase
      .from('promotion_usages')
      .select('id')
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPromotionUsage) {
      return NextResponse.json({ error: 'already_used' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('wallet_balance')
      .eq('discord_id', userId)
      .eq('server_id', server.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    // Apply promotion
    const newBalance = profile.wallet_balance + promotion.value;

    // Update wallet balance
    const { error: walletError } = await supabase
      .from('member_profiles')
      .update({ wallet_balance: newBalance })
      .eq('discord_id', userId)
      .eq('server_id', server.id);

    if (walletError) {
      console.error('Wallet update error:', walletError);
      return NextResponse.json({ error: 'wallet_update_failed' }, { status: 500 });
    }

    // Record usage
    const { error: usageError } = await supabase
      .from('promotion_usages')
      .insert({
        promotion_id: promotion.id,
        user_id: userId,
        used_at: new Date().toISOString(),
      });

    if (usageError) {
      console.error('Usage record error:', usageError);
      // Don't fail the request if usage recording fails
    }

    // Update promotion usage count
    const { error: updateError } = await supabase
      .from('promotions')
      .update({ used_count: promotion.used_count + 1 })
      .eq('id', promotion.id);

    if (updateError) {
      console.error('Promotion update error:', updateError);
      // Don't fail the request if count update fails
    }

    return NextResponse.json({
      success: true,
      message: 'promotion_applied',
      amount: promotion.value,
      newBalance,
    });

  } catch (error) {
    console.error('Promotion usage error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
