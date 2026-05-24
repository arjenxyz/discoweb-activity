/**
 * POST /api/member/referral
 * body: { code: string } — 6 haneli davet kodu
 */

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { applyReferralByCode, REFERRAL_HTTP_STATUS } from '@/lib/referral';

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
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
    if (!selectedGuildId) return NextResponse.json({ error: 'no_guild_specified' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim();

    const result = await applyReferralByCode(supabase, {
      guildId: selectedGuildId,
      inviteeUserId: session.userId,
      code,
      clientIp: getClientIp(request),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: REFERRAL_HTTP_STATUS[result.error] });
    }

    return NextResponse.json({
      success: true,
      reward: result.reward,
      milestone_reached: result.milestone_reached,
      milestone_bonus: result.milestone_bonus,
    });
  } catch (err) {
    console.error('[referral]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
