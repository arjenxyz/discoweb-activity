import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
};

// POST /api/member/report
export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  const body = await request.json() as {
    type?: 'bug' | 'suggestion';
    section?: string;
    description?: string;
  };

  const { type, section, description } = body;
  if (!type || !description?.trim()) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  if (!['bug', 'suggestion'].includes(type)) return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  if (description.length > 2000) return NextResponse.json({ error: 'too_long' }, { status: 400 });

  const supabase = getSupabase();

  // Rate limit: max 3 open reports per user
  const { count } = await supabase
    .from('bug_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .in('status', ['open', 'reviewing', 'need_info']);
  if ((count ?? 0) >= 3) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { data, error } = await supabase
    .from('bug_reports')
    .insert({
      user_id: session.userId,
      guild_id: guildId ?? null,
      type,
      section: section?.trim() || null,
      description: description.trim(),
      status: 'open',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify bot via webhook to ping dev role
  const webhookUrl = process.env.DISCORD_DEV_WEBHOOK_URL;
  if (webhookUrl) {
    const emoji = type === 'bug' ? '🐛' : '💡';
    const typeLabel = type === 'bug' ? 'Hata Bildirimi' : 'Öneri';
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `<@&${process.env.DEVELOPER_ROLE_ID ?? ''}> ${emoji} **Yeni ${typeLabel}** geldi!`,
        embeds: [{
          title: `${emoji} ${typeLabel}${section ? ` — ${section}` : ''}`,
          description: description.trim().slice(0, 1000),
          color: type === 'bug' ? 0xED4245 : 0x5865F2,
          fields: [
            { name: 'Kullanıcı', value: `<@${session.userId}>`, inline: true },
            ...(guildId ? [{ name: 'Sunucu', value: guildId, inline: true }] : []),
          ],
          footer: { text: `ID: ${data.id} · Web panelinden incele` },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: data.id });
}
