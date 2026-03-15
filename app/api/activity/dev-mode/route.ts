import { NextResponse } from 'next/server';

export async function GET() {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ 
      flags: {},
      serverId: 'dev-mode'
    });
  }
  
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
}
