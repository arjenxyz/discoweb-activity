import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';

export async function GET() {
  try {
    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const { data: messages, error } = await supabaseServiceClient
      .from('system_mails')
      .select('*')
      .eq('category', 'announcement')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Duyuru mesajları alınırken hata:', error);
      return NextResponse.json({ error: 'Mesajlar alınamadı' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
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
    const { title, body } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Başlık ve mesaj içeriği gerekli' }, { status: 400 });
    }

    // Kullanıcı bilgilerini al
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Kullanıcı bilgileri alınamadı' }, { status: 400 });
    }

    const user = await userResponse.json();

    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    // Mesajı kaydet
    const { data, error } = await supabaseServiceClient
      .from('system_mails')
      .insert({
        guild_id: 'global', // Global duyuru
        title: title.trim(),
        body: body.trim(),
        category: 'announcement',
        status: 'published',
        created_by: user.id,
        author_name: user.username || user.global_name,
        author_avatar_url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null,
        user_id: null, // Global mesaj
      })
      .select()
      .single();

    if (error) {
      console.error('Duyuru mesajı kaydedilirken hata:', error);
      return NextResponse.json({ error: 'Mesaj kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Duyuru başarıyla gönderildi', data });
  } catch (err) {
    console.error('Duyuru POST hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}