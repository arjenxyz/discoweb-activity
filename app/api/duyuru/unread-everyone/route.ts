import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(request);
    if (!auth.ok) {
      return NextResponse.json({ count: 0 });
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('id')
      .eq('is_active', true)
      .eq('mentions_everyone', true);

    if (error) {
      console.error('Duyuru everyone count hatası:', error);
      return NextResponse.json({ error: 'Sayım alınamadı' }, { status: 500 });
    }

    const ids = (announcements ?? []).map((row) => row.id);
    if (ids.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', auth.userId)
      .in('announcement_id', ids);

    const readSet = new Set((reads ?? []).map((row) => row.announcement_id));
    const count = ids.filter((id) => !readSet.has(id)).length;

    return NextResponse.json({ count });
  } catch (err) {
    console.error('Duyuru everyone count GET hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
