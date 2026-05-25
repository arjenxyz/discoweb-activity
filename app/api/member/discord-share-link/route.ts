/**
 * POST /api/member/discord-share-link
 * Activity paylaşımı için ephemeral quick-link (link_id) üretir.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function POST(req: NextRequest) {
  const session = await requireSessionUser(req);
  if (!session.ok) return session.response;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('oauth_access_token')
    .eq('discord_id', session.userId)
    .maybeSingle();

  if (!userRow?.oauth_access_token) {
    return NextResponse.json({ error: 'no_token' }, { status: 401 });
  }

  const applicationId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  if (!applicationId) {
    return NextResponse.json({ error: 'missing_app_id' }, { status: 500 });
  }

  let body: { title?: string; description?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* defaults */
  }

  const title = body.title ?? 'DiscoWeb';
  const description = body.description ?? 'Sunucu panelinizi yönetin!';

  const discordRes = await fetch(`${DISCORD_API}/applications/${applicationId}/quick-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userRow.oauth_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, description }),
  });

  if (!discordRes.ok) {
    const errText = await discordRes.text().catch(() => '');
    console.error('[discord-share-link]', discordRes.status, errText);
    return NextResponse.json(
      { error: 'discord_api_error', status: discordRes.status },
      { status: discordRes.status >= 500 ? 502 : 422 },
    );
  }

  const data = (await discordRes.json()) as { link_id?: string };
  return NextResponse.json({ link_id: data.link_id ?? null });
}
