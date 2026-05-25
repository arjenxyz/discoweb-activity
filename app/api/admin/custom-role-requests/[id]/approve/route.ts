import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/guildAdmin';
import {
  assignMemberRole,
  canBotManageRole,
  createGuildRole,
  fetchGuildRoles,
  getBotMaxRolePosition,
  dataUrlToIconBase64,
  setGuildRoleIcon,
} from '@/lib/customRoles/discord';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireGuildAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    target_user_id?: string;
    duration_hours?: number;
    auto_assign?: boolean;
    hierarchy_ack?: boolean;
    admin_note?: string;
    raffle_label?: string;
  };

  const targetUserId = String(body.target_user_id ?? '').trim();
  if (!targetUserId) {
    return NextResponse.json({ error: 'missing_target_user' }, { status: 400 });
  }

  const durationHours = Math.min(8760, Math.max(1, Number(body.duration_hours) || 24));
  if (!body.hierarchy_ack) {
    return NextResponse.json({ error: 'hierarchy_ack_required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data: row, error: fetchErr } = await supabase
    .from('custom_role_requests')
    .select('*')
    .eq('id', id)
    .eq('guild_id', auth.guildId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 409 });
  }

  try {
    const botMax = await getBotMaxRolePosition(auth.botToken, auth.guildId);
    const created = await createGuildRole(auth.botToken, auth.guildId, {
      name: row.role_name,
      color: row.role_color,
      hoist: row.hoist,
      mentionable: row.mentionable,
      unicode_emoji: row.role_emoji,
    });

    const roles = await fetchGuildRoles(auth.botToken, auth.guildId);
    const createdRole = roles.find((r) => r.id === created.id);
    const position = createdRole?.position ?? created.position ?? 0;

    if (row.role_icon_url) {
      const b64 = dataUrlToIconBase64(row.role_icon_url);
      if (b64) {
        try {
          await setGuildRoleIcon(auth.botToken, auth.guildId, created.id, b64);
        } catch (e) {
          console.warn('[custom-role approve] icon upload failed', e);
        }
      }
    }

    if (!canBotManageRole(botMax, position)) {
      await fetch(`https://discord.com/api/guilds/${auth.guildId}/roles/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bot ${auth.botToken}` },
      }).catch(() => null);
      return NextResponse.json(
        {
          error: 'bot_hierarchy',
          message: 'Rol botun altında oluştu. Sunucu ayarlarından rolü yukarı taşıyın.',
        },
        { status: 403 },
      );
    }

    const expiresAt = new Date(Date.now() + durationHours * 3600_000).toISOString();
    let assignedAt: string | null = null;

    if (body.auto_assign) {
      await assignMemberRole(auth.botToken, auth.guildId, targetUserId, created.id);
      assignedAt = new Date().toISOString();
    }

    const { data: updated, error: updErr } = await supabase
      .from('custom_role_requests')
      .update({
        status: 'active',
        target_user_id: targetUserId,
        duration_hours: durationHours,
        expires_at: expiresAt,
        auto_assign: Boolean(body.auto_assign),
        discord_role_id: created.id,
        assigned_at: assignedAt,
        reviewed_by: auth.userId,
        admin_note: String(body.admin_note ?? '').trim().slice(0, 500) || null,
        hierarchy_ack: true,
        raffle_label: body.raffle_label?.trim().slice(0, 120) || row.raffle_label,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({
      request: updated,
      role_position: position,
      bot_max_position: botMax,
      hierarchy_warning: position <= 1,
    });
  } catch (e) {
    console.error('[custom-role approve]', e);
    return NextResponse.json({ error: 'discord_failed', detail: String(e) }, { status: 500 });
  }
}
