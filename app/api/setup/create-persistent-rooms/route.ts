import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      console.error('[create-persistent-rooms] Missing Supabase config');
      return NextResponse.json({ error: { message: 'Missing Supabase configuration' } }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const desired = [
      { name: 'Member Help', room_type: 'help', is_persistent: true },
      { name: 'Command Room', room_type: 'help', is_persistent: true },
      { name: 'Komut Help', room_type: 'help', is_persistent: true },
    ];

    type RoomResult = { existing?: Record<string, unknown> } | { created?: Record<string, unknown> };
    const results: RoomResult[] = [];

    for (const r of desired) {
      // check if a persistent room with this name already exists
      const { data: existing, error: selErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('name', r.name)
        .eq('is_persistent', true)
        .maybeSingle();

      if (selErr) {
        console.error('[create-persistent-rooms] select error', selErr);
        return NextResponse.json({ error: { message: 'DB select failed' } }, { status: 500 });
      }

      if (existing) {
        results.push({ existing });
        continue;
      }

      const { data: inserted, error: insErr } = await supabase
        .from('rooms')
        .insert({ room_type: r.room_type, name: r.name, is_persistent: r.is_persistent })
        .select()
        .single();

      if (insErr) {
        console.error('[create-persistent-rooms] insert error', insErr);
        return NextResponse.json({ error: { message: 'DB insert failed' } }, { status: 500 });
      }

      results.push({ created: inserted });
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error('[create-persistent-rooms] unexpected error', e);
    return NextResponse.json({ error: { message: String(e) } }, { status: 500 });
  }
}
