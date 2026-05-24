/**
 * POST /api/member/referral-by-user
 *
 * Discord Embedded App SDK referrerId ile gelen davetleri işler.
 * Body: { referrer_discord_id: string }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { applyReferralByInviterId, REFERRAL_HTTP_STATUS } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const getClientIp = (request: Request): string | null =>
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  request.headers.get('x-real-ip') ??
  null;

export async function POST(request: Request) {
  try {
    const session = await requireSessionUser(request);
    if (!session.ok) return session.response;

    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

    const selectedGuildId = await getSelectedGuildId(request);
    if (!selectedGuildId) {
      return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const referrerDiscordId = String(body.referrer_discord_id ?? '').trim();

    const result = await applyReferralByInviterId(supabase, {
      guildId: selectedGuildId,
      inviteeUserId: session.userId,
      inviterUserId: referrerDiscordId,
      clientIp: getClientIp(request),
    });

    if (!result.ok) {
      const status = REFERRAL_HTTP_STATUS[result.error];
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      reward: result.reward,
      milestone_reached: result.milestone_reached,
      milestone_bonus: result.milestone_bonus,
    });
  } catch (err) {
    console.error('[referral-by-user]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
