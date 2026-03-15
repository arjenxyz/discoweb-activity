import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if (!auth.ok) {
      return auth.response;
    }
    console.log('Guilds API: Starting request');
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('discord_access_token')?.value;
    console.log('Guilds API: Access token exists:', !!accessToken);

    if (!accessToken) {
      console.log('Guilds API: No access token, returning 401');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    console.log('Guilds API: Fetching user guilds from Discord API');
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('Guilds API: Discord API response status:', response.status);

    if (!response.ok) {
      console.log('Guilds API: Discord API failed, status:', response.status);
      return NextResponse.json({ error: 'failed_to_fetch_guilds' }, { status: response.status });
    }

    const guilds = await response.json();
    console.log('Guilds API: Fetched', guilds.length, 'guilds from Discord API');

    const botToken = process.env.DISCORD_BOT_TOKEN;
    console.log('Guilds API: Bot token exists:', !!botToken);
    if (!botToken) {
      console.log('Guilds API: No bot token, returning empty guilds');
      return NextResponse.json({ guilds: [] });
    }

    console.log('Guilds API: Filtering guilds where bot is present...');
    const filteredGuilds: any[] = [];
    for (const guild of guilds) {
      try {
        console.log(`Guilds API: Checking bot presence in guild ${guild.name} (${guild.id})`);
        const botResponse = await fetch(`https://discord.com/api/guilds/${guild.id}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (botResponse.ok) {
          console.log(`Guilds API: Bot is present in ${guild.name}`);
          filteredGuilds.push(guild);
        } else {
          console.log(`Guilds API: Bot not present in ${guild.name}, status: ${botResponse.status}`);
        }
      } catch (error) {
        console.log(`Guilds API: Error checking bot presence in ${guild.name}:`, error);
      }
    }

    console.log('Guilds API: Returning', filteredGuilds.length, 'filtered guilds');
    return NextResponse.json({ guilds: filteredGuilds });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
