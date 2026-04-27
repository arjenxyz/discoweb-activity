import { promises as fs } from 'fs';
import path from 'path';
import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';

const DEFAULT_MUSIC_TRACK = '/music/music.mp3';
export const runtime = 'nodejs';

export async function GET() {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  try {
    const files = await fs.readdir(musicDir);
    const tracks = files
      .filter((file) => file.toLowerCase().endsWith('.mp3'))
      .map((file) => `/music/${file}`);

    return NextResponse.json({ tracks: tracks.length > 0 ? tracks : [DEFAULT_MUSIC_TRACK] });
  } catch {
    return NextResponse.json({ tracks: [DEFAULT_MUSIC_TRACK] });
  }
}
