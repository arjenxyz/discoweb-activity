import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { isLocalDevRequest } from '@/lib/localDev';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';
const DEV_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';

export async function GET(request: Request) {
  console.log('is-developer API called');

  if (isLocalDevRequest(request)) {
    return NextResponse.json({ isDeveloper: true });
  }
  
  const auth = await requireSessionUser(request);
  console.log('Auth result:', auth.ok, auth.userId);
  if (!auth.ok) return NextResponse.json({ isDeveloper: false });

  // Check if user ID matches developer user ID (simple fallback)
  if (DEV_USER_ID && auth.userId === DEV_USER_ID) {
    console.log('User is developer by user ID match');
    return NextResponse.json({ isDeveloper: true });
  }

  if (!DEV_GUILD_ID || !DEV_ROLE_ID) {
    console.log('Missing env vars for role check:', { DEV_GUILD_ID: !!DEV_GUILD_ID, DEV_ROLE_ID: !!DEV_ROLE_ID });
    return NextResponse.json({ isDeveloper: false });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.log('Missing bot token');
    return NextResponse.json({ isDeveloper: false });
  }

  try {
    console.log('Checking Discord API for user:', auth.userId);
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${auth.userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    console.log('Discord API response status:', res.status);
    if (!res.ok) return NextResponse.json({ isDeveloper: false });
    const member = await res.json() as { roles?: string[] };
    console.log('User roles:', member.roles);
    const isDeveloper = Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
    console.log('Is developer:', isDeveloper);
    return NextResponse.json({ isDeveloper });
  } catch (error) {
    console.error('Discord API error:', error);
    return NextResponse.json({ isDeveloper: false });
  }
}
