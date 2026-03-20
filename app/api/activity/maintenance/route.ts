import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ maintenance: false });
  }

  const { data } = await supabase
    .from('maintenance_flags')
    .select('is_enabled')
    .eq('key', 'activity')
    .single();

  return NextResponse.json({ maintenance: data?.is_enabled === true });
}
