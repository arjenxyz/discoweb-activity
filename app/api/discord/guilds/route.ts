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
    if (!botToken) {
      console.log('Guilds API: No bot token configured');
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    // Paralel kontrol — max 5 eş zamanlı istek (rate limit koruması)
    const CONCURRENCY = 5;
    const filteredGuilds: any[] = [];

    for (let i = 0; i < guilds.length; i += CONCURRENCY) {
      const batch = guilds.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (guild: any) => {
          try {
            const botResponse = await fetch(`https://discord.com/api/guilds/${guild.id}`, {
              headers: { Authorization: `Bot ${botToken}` },
            });
            if (botResponse.status === 429) {
              const retryAfter = botResponse.headers.get('Retry-After');
              const waitMs = retryAfter ? Math.min(parseFloat(retryAfter) * 1000, 3000) : 1000;
              await new Promise((r) => setTimeout(r, waitMs));
              const retryResponse = await fetch(`https://discord.com/api/guilds/${guild.id}`, {
                headers: { Authorization: `Bot ${botToken}` },
              });
              return retryResponse.ok ? guild : null;
            }
            return botResponse.ok ? guild : null;
          } catch {
            return null;
          }
        })
      );
      filteredGuilds.push(...results.filter(Boolean));
    }

    console.log('Guilds API: Returning', filteredGuilds.length, 'filtered guilds');
    return NextResponse.json({ guilds: filteredGuilds });
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
