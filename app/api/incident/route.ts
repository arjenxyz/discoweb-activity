import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_MESSAGE =
  'Şu anda büyük bir sorunu çözmek için çalışıyoruz, lütfen sabırlı olun.';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ active: false });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('system_incident')
      .select('id,title,public_message,started_at,status')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const msg = error.message || '';
      if (!/schema cache|could not find the table|does not exist/i.test(msg)) {
        console.error('[activity/api/incident]', msg);
      }
      return NextResponse.json({ active: false });
    }

    if (!data) return NextResponse.json({ active: false });

    return NextResponse.json({
      active: true,
      id: data.id,
      title: data.title,
      message: data.public_message || DEFAULT_MESSAGE,
      started_at: data.started_at,
    });
  } catch (error) {
    console.error('[activity/api/incident]', error);
    return NextResponse.json({ active: false });
  }
}
