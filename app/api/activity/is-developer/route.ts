import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';

export async function GET(request: Request) {
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) {
    return NextResponse.json({ isDeveloper: false });
  }

  const auth = await requireSessionUser(request);
  if (!auth.ok) return NextResponse.json({ isDeveloper: false });

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return NextResponse.json({ isDeveloper: false });

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${auth.userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return NextResponse.json({ isDeveloper: false });
    const member = await res.json() as { roles?: string[] };
    const isDeveloper = Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
    return NextResponse.json({ isDeveloper });
  } catch {
    return NextResponse.json({ isDeveloper: false });
  }
}
