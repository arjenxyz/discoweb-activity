import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

export async function GET(request: NextRequest) {
  try {
    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    // Get user's language from query params or default to 'en'
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';

    const { data, error } = await supabaseServiceClient
      .from('announcements')
      .select(`
        id,
        created_at,
        announcement_translations!inner (
          title,
          content,
          lang_code
        )
      `)
      .eq('is_active', true)
      .eq('announcement_translations.lang_code', lang)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Duyuru mesajları alınırken hata:', error);
      return NextResponse.json({ error: 'Mesajlar alınamadı' }, { status: 500 });
    }

    // Transform data to match expected format
    const messages = data?.map(item => ({
      id: item.id,
      title: item.announcement_translations[0]?.title || '',
      body: item.announcement_translations[0]?.content || '',
      created_at: item.created_at,
      author_name: 'System', // System announcements
      author_avatar_url: null,
    })) || [];

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Duyuru GET hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Developer kontrolü
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const isDeveloperResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/activity/is-developer`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!isDeveloperResponse.ok) {
      return NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 });
    }

    const developerData = await isDeveloperResponse.json();
    if (!developerData.isDeveloper) {
      return NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 });
    }

    // Mesaj verilerini al
    const { title, body, lang = 'tr' } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Başlık ve mesaj içeriği gerekli' }, { status: 400 });
    }

    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    // Create announcement
    const { data: announcement, error: announcementError } = await supabaseServiceClient
      .from('announcements')
      .insert({
        is_active: true,
      })
      .select()
      .single();

    if (announcementError) {
      console.error('Duyuru oluşturulurken hata:', announcementError);
      return NextResponse.json({ error: 'Duyuru oluşturulamadı' }, { status: 500 });
    }

    // Create translation
    const { data: translation, error: translationError } = await supabaseServiceClient
      .from('announcement_translations')
      .insert({
        announcement_id: announcement.id,
        lang_code: lang,
        title: title.trim(),
        content: body.trim(),
      })
      .select()
      .single();

    if (translationError) {
      console.error('Duyuru çevirisi kaydedilirken hata:', translationError);
      // Clean up the announcement if translation fails
      await supabaseServiceClient
        .from('announcements')
        .delete()
        .eq('id', announcement.id);
      return NextResponse.json({ error: 'Duyuru kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Duyuru başarıyla gönderildi',
      data: {
        announcement_id: announcement.id,
        translation_id: translation.id
      }
    });
  } catch (err) {
    console.error('Duyuru POST hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}