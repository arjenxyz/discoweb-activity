import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { checkMaintenance } from '@/lib/maintenance';
import { getSelectedGuildId } from '@/lib/guild';
import { mapPromoErrorForClient, redeemPromoCode } from '@/lib/promotions/redeemPromo';

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
    const maintenance = await checkMaintenance(['site', 'promotions']);
    if (maintenance.blocked) {
      return NextResponse.json({ error: 'maintenance' }, { status: 503 });
    }

    const session = await requireSessionUser(request);
    if (!session.ok) {
      return session.response;
    }

    const { code } = (await request.json()) as { code?: string };
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    const supabase = getSupabase();
    const result = await redeemPromoCode({
      supabase,
      userId: session.userId,
      guildId: selectedGuildId,
      code,
      request,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: mapPromoErrorForClient(result.error) },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'promotion_applied',
      amount: result.amount,
      newBalance: result.balance,
    });
  } catch (error) {
    console.error('Promotion usage error:', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
