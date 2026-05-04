import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

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

    const announcementIds = data?.map((item) => item.id) ?? [];
    const pollsByAnnouncementId = new Map<string, {
      id: string;
      question: string;
      options: Array<{ id: string; label: string; position: number }>;
    }>();

    if (announcementIds.length > 0) {
      const { data: pollRows } = await supabaseServiceClient
        .from('announcement_polls')
        .select(`
          id,
          announcement_id,
          question,
          announcement_poll_options (
            id,
            label,
            position
          )
        `)
        .in('announcement_id', announcementIds);

      pollRows?.forEach((poll) => {
        pollsByAnnouncementId.set(poll.announcement_id, {
          id: poll.id,
          question: poll.question,
          options: (poll.announcement_poll_options ?? []).slice().sort(
            (a, b) => (a.position ?? 0) - (b.position ?? 0),
          ),
        });
      });
    }

    const auth = await requireSessionUser(request);
    const userId = auth.ok ? auth.userId : null;
    const pollIds = Array.from(pollsByAnnouncementId.values()).map((poll) => poll.id);

    const voteCounts = new Map<string, number>();
    const userVotes = new Map<string, string>();

    if (pollIds.length > 0) {
      const { data: voteRows } = await supabaseServiceClient
        .from('announcement_poll_votes')
        .select('poll_id, option_id, user_id')
        .in('poll_id', pollIds);

      voteRows?.forEach((vote) => {
        voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) ?? 0) + 1);
        if (userId && vote.user_id === userId) {
          userVotes.set(vote.poll_id, vote.option_id);
        }
      });
    }

    // Transform data to match expected format
    const messages = data?.map(item => {
      const poll = pollsByAnnouncementId.get(item.id);
      return {
        id: item.id,
        title: item.announcement_translations[0]?.title || '',
        body: item.announcement_translations[0]?.content || '',
        created_at: item.created_at,
        author_name: 'System', // System announcements
        author_avatar_url: null,
        poll: poll
          ? {
              id: poll.id,
              question: poll.question,
              userVoteOptionId: userVotes.get(poll.id) ?? null,
              options: poll.options.map((option) => ({
                id: option.id,
                label: option.label,
                position: option.position,
                voteCount: voteCounts.get(option.id) ?? 0,
              })),
            }
          : null,
      };
    }) || [];

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Duyuru GET hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(request);
    if (!auth.ok) {
      return auth.response;
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const cookieHeader = request.headers.get('cookie') ?? '';
    const requestOrigin = new URL(request.url).origin;
    const developerUrl = `${process.env.NEXT_PUBLIC_API_URL || requestOrigin}/api/activity/is-developer`;
    const isDeveloperResponse = await fetch(developerUrl, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    if (!isDeveloperResponse.ok) {
      return NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 });
    }

    const developerData = await isDeveloperResponse.json();
    if (!developerData.isDeveloper) {
      return NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 });
    }

    // Mesaj verilerini al
    const { title, body, lang = 'tr', poll } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Başlık ve mesaj içeriği gerekli' }, { status: 400 });
    }

    const pollQuestion = poll?.question?.trim?.() ?? '';
    const pollOptions = Array.isArray(poll?.options)
      ? poll.options.map((option: string) => String(option).trim()).filter(Boolean)
      : [];
    const hasPoll = pollQuestion.length > 0 && pollOptions.length >= 2;

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

    if (hasPoll) {
      const { data: pollRow, error: pollError } = await supabaseServiceClient
        .from('announcement_polls')
        .insert({
          announcement_id: announcement.id,
          question: pollQuestion,
        })
        .select()
        .single();

      if (pollError || !pollRow) {
        console.error('Duyuru anketi olusturulurken hata:', pollError);
        await supabaseServiceClient
          .from('announcements')
          .delete()
          .eq('id', announcement.id);
        return NextResponse.json({ error: 'Anket olusturulamadi' }, { status: 500 });
      }

      const optionRows = pollOptions.map((option: string, index: number) => ({
        poll_id: pollRow.id,
        label: option,
        position: index + 1,
      }));

      const { error: optionsError } = await supabaseServiceClient
        .from('announcement_poll_options')
        .insert(optionRows);

      if (optionsError) {
        console.error('Duyuru anket secenekleri kaydedilirken hata:', optionsError);
        await supabaseServiceClient
          .from('announcements')
          .delete()
          .eq('id', announcement.id);
        return NextResponse.json({ error: 'Anket secenekleri kaydedilemedi' }, { status: 500 });
      }
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