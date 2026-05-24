import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(request);
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const payload = (await request.json().catch(() => ({}))) as { announcementIds?: string[] };
    let targetIds = payload.announcementIds?.filter(Boolean) ?? [];

    if (targetIds.length === 0) {
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id')
        .eq('is_active', true)
        .eq('mentions_everyone', true);

      targetIds = (announcements ?? []).map((row) => row.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ status: 'ok', marked: 0 });
    }

    const now = new Date().toISOString();
    const rows = targetIds.map((announcement_id) => ({
      announcement_id,
      user_id: auth.userId,
      read_at: now,
    }));

    const { error } = await supabase
      .from('announcement_reads')
      .upsert(rows, { onConflict: 'announcement_id,user_id' });

    if (error) {
      console.error('Duyuru read upsert hatası:', error);
      return NextResponse.json({ error: 'Okundu işaretlenemedi' }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok', marked: targetIds.length });
  } catch (err) {
    console.error('Duyuru read POST hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
