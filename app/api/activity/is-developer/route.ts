import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';

export async function GET(request: Request) {
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) {
    return NextResponse.json({ isDeveloper: false });
  }

  const auth = await requireSessionUser(request);
  if (!auth.ok) return NextResponse.json({ isDeveloper: false });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ isDeveloper: false });

  // member_profiles tablosunda roles dizisi içinde DEV_ROLE_ID var mı?
  const { data, error } = await supabase
    .from('member_profiles')
    .select('roles')
    .eq('user_id', auth.userId)
    .eq('guild_id', DEV_GUILD_ID)
    .single();

  console.log('[is-developer]', { userId: auth.userId, DEV_GUILD_ID, DEV_ROLE_ID, data, error: error?.message });

  const roles: string[] = data?.roles ?? [];
  return NextResponse.json({ isDeveloper: roles.includes(DEV_ROLE_ID), _debug: { userId: auth.userId, roles, DEV_GUILD_ID } });
}
