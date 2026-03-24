/**
 * POST /api/member/discord-share-link
 *
 * Generates an ephemeral Discord quick-link (30-day TTL) for the Activity
 * using the user's OAuth Bearer token, then returns the link_id so the
 * frontend can pass it to discordSdk.commands.shareLink({ link_id }).
 *
 * Body: { custom_id?: string; title?: string; description?: string; image_base64?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DISCORD_API = 'https://discord.com/api/v10';

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await requireSessionUser(req);
  if (!session.ok) return session.response;

  // 2. Get user's OAuth access token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

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

  // 3. Parse body
  let body: {
    custom_id?: string;
    title?: string;
    description?: string;
    image_base64?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    // use defaults
  }

  const title = body.title ?? 'DiscoWeb';
  const description = body.description ?? 'Sunucu panelinizi yönetin, ekonominizi büyütün!';
  const custom_id = body.custom_id ?? null;

  // 4. Call Discord's quick-links endpoint
  const payload: Record<string, unknown> = { title, description };
  if (custom_id) payload.custom_id = custom_id;
  if (body.image_base64) payload.image = body.image_base64;

  const discordRes = await fetch(`${DISCORD_API}/applications/${applicationId}/quick-links`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userRow.oauth_access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!discordRes.ok) {
    const errText = await discordRes.text().catch(() => '');
    console.error('[discord-share-link] Discord API error:', discordRes.status, errText);
    return NextResponse.json(
      { error: 'discord_api_error', status: discordRes.status, detail: errText },
      { status: discordRes.status >= 500 ? 502 : 422 },
    );
  }

  const data = await discordRes.json() as { link_id?: string };
  return NextResponse.json({ link_id: data.link_id });
}
