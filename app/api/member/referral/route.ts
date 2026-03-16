import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
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

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
    }

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim().toUpperCase();
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    // Already referred?
    const { data: currentProfile } = await supabase
      .from('member_profiles')
      .select('referred_by')
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId)
      .maybeSingle();

    if (currentProfile?.referred_by) {
      return NextResponse.json({ error: 'already_referred' }, { status: 400 });
    }

    // Find owner of code
    const { data: ownerProfile } = await supabase
      .from('member_profiles')
      .select('user_id')
      .eq('guild_id', selectedGuildId)
      .eq('referral_code', code)
      .maybeSingle();

    if (!ownerProfile || !ownerProfile.user_id) {
      return NextResponse.json({ error: 'code_not_found' }, { status: 404 });
    }

    if (ownerProfile.user_id === userId) {
      return NextResponse.json({ error: 'cannot_use_own_code' }, { status: 400 });
    }

    // Update referred_by for current user
    const { error: updateErr } = await supabase
      .from('member_profiles')
      .update({ referred_by: ownerProfile.user_id, updated_at: new Date().toISOString() })
      .eq('guild_id', selectedGuildId)
      .eq('user_id', userId);

    if (updateErr) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    const reward = 500;

    // Ensure wallets exist and add reward
    const ensureWallet = async (uid: string) => {
      const { data: wallet } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', selectedGuildId)
        .eq('user_id', uid)
        .maybeSingle();

      if (!wallet) {
        await supabase.from('member_wallets').insert({
          guild_id: selectedGuildId,
          user_id: uid,
          balance: reward,
        });
      } else {
        await supabase
          .from('member_wallets')
          .update({ balance: (wallet.balance ?? 0) + reward })
          .eq('guild_id', selectedGuildId)
          .eq('user_id', uid);
      }
    };

    await ensureWallet(userId);
    await ensureWallet(ownerProfile.user_id);

    return NextResponse.json({ success: true, reward });
  } catch (err) {
    console.error('referral route error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
