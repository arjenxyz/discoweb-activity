import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

async function requireDeveloper(request: NextRequest) {
  const auth = await requireSessionUser(request);
  if (!auth.ok) {
    return auth;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const cookieHeader = request.headers.get('cookie') ?? '';
  const requestOrigin = new URL(request.url).origin;
  const developerUrl = `${process.env.NEXT_PUBLIC_API_URL || requestOrigin}/api/activity/is-developer`;
  const developerResponse = await fetch(developerUrl, {
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });

  if (!developerResponse.ok) {
    return { ok: false, response: NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 }) };
  }

  const developerData = await developerResponse.json();
  if (!developerData?.isDeveloper) {
    return { ok: false, response: NextResponse.json({ error: 'Developer yetkisi gerekli' }, { status: 403 }) };
  }

  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireDeveloper(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'tr';
    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const { data, error } = await supabaseServiceClient
      .from('announcements')
      .select(`
        id,
        created_at,
        is_active,
        announcement_translations!inner (
          title,
          content,
          lang_code
        )
      `)
      .eq('announcement_translations.lang_code', lang)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin duyuru listesi hatası:', error);
      return NextResponse.json({ error: 'Duyurular alınamadı' }, { status: 500 });
    }

    const announcementIds = data?.map((item) => item.id) ?? [];
    const pollsByAnnouncementId = new Map<string, {
      id: string;
      question: string;
      options: Array<{ id: string; label: string; position: number }>;
    }>();

    if (announcementIds.length > 0) {
      const { data: pollRows, error: pollError } = await supabaseServiceClient
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

      if (pollError) {
        console.error('Admin duyuru anketleri alınırken hata:', pollError);
      }

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

    const announcements = (data ?? []).map((item) => ({
      id: item.id,
      title: item.announcement_translations[0]?.title || '',
      content: item.announcement_translations[0]?.content || '',
      created_at: item.created_at,
      is_active: item.is_active,
      poll: pollsByAnnouncementId.get(item.id) ?? null,
    }));

    return NextResponse.json({ announcements });
  } catch (err) {
    console.error('Admin announcements GET error:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireDeveloper(request);
  if (!auth.ok) return auth.response;

  try {
    const { title, body, lang = 'tr', poll } = await request.json();
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Başlık ve içerik gerekli' }, { status: 400 });
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

    const { data: announcement, error: announcementError } = await supabaseServiceClient
      .from('announcements')
      .insert({ is_active: true })
      .select()
      .single();

    if (announcementError) {
      console.error('Duyuru oluşturma hatası:', announcementError);
      return NextResponse.json({ error: 'Duyuru oluşturulamadı' }, { status: 500 });
    }

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
      console.error('Duyuru çevirisi hatası:', translationError);
      await supabaseServiceClient.from('announcements').delete().eq('id', announcement.id);
      return NextResponse.json({ error: 'Duyuru kaydedilemedi' }, { status: 500 });
    }

    if (hasPoll) {
      const { data: pollRow, error: pollError } = await supabaseServiceClient
        .from('announcement_polls')
        .insert({ announcement_id: announcement.id, question: pollQuestion })
        .select()
        .single();

      if (pollError || !pollRow) {
        console.error('Anket oluşturma hatası:', pollError);
        await supabaseServiceClient.from('announcements').delete().eq('id', announcement.id);
        return NextResponse.json({ error: 'Anket oluşturulamadı' }, { status: 500 });
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
        console.error('Anket seçenekleri hatası:', optionsError);
        await supabaseServiceClient.from('announcements').delete().eq('id', announcement.id);
        return NextResponse.json({ error: 'Anket seçenekleri kaydedilemedi' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Duyuru başarıyla oluşturuldu', announcement_id: announcement.id });
  } catch (err) {
    console.error('Admin announcements POST error:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireDeveloper(request);
  if (!auth.ok) return auth.response;

  try {
    const { id, title, body, lang = 'tr', poll } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Duyuru kimliği gerekli' }, { status: 400 });
    }
    if (!title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Başlık ve içerik gerekli' }, { status: 400 });
    }

    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const { data: existingAnnouncement, error: existingError } = await supabaseServiceClient
      .from('announcements')
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existingAnnouncement) {
      return NextResponse.json({ error: 'Duyuru bulunamadı' }, { status: 404 });
    }

    const { data: updatedTranslations, error: translationUpdateError } = await supabaseServiceClient
      .from('announcement_translations')
      .update({
        title: title.trim(),
        content: body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('announcement_id', id)
      .eq('lang_code', lang)
      .select('id');

    if (translationUpdateError) {
      console.error('Duyuru çevirisi güncelleme hatası:', translationUpdateError);
      return NextResponse.json({ error: 'Duyuru çevirisi güncellenemedi' }, { status: 500 });
    }

    if (!updatedTranslations || updatedTranslations.length === 0) {
      const { error: translationInsertError } = await supabaseServiceClient
        .from('announcement_translations')
        .insert({
          announcement_id: id,
          lang_code: lang,
          title: title.trim(),
          content: body.trim(),
        });

      if (translationInsertError) {
        console.error('Duyuru çevirisi ekleme hatası:', translationInsertError);
        return NextResponse.json({ error: 'Duyuru çevirisi güncellenemedi' }, { status: 500 });
      }
    }

    const pollQuestion = poll?.question?.trim?.() ?? '';
    const pollOptions = Array.isArray(poll?.options)
      ? poll.options.map((option: string) => String(option).trim()).filter(Boolean)
      : [];
    const hasPoll = pollQuestion.length > 0 && pollOptions.length >= 2;

    const { data: existingPoll, error: pollFetchError } = await supabaseServiceClient
      .from('announcement_polls')
      .select('id')
      .eq('announcement_id', id)
      .single();

    if (pollFetchError && pollFetchError.code !== 'PGRST102') {
      console.error('Mevcut anket kontrol hatası:', pollFetchError);
      return NextResponse.json({ error: 'Anket kontrolü yapılamadı' }, { status: 500 });
    }

    if (!hasPoll) {
      if (existingPoll) {
        const { error: deletePollError } = await supabaseServiceClient
          .from('announcement_polls')
          .delete()
          .eq('id', existingPoll.id);
        if (deletePollError) {
          console.error('Anket silme hatası:', deletePollError);
          return NextResponse.json({ error: 'Anket silinemedi' }, { status: 500 });
        }
      }
    } else {
      if (existingPoll) {
        const { error: updatePollError } = await supabaseServiceClient
          .from('announcement_polls')
          .update({ question: pollQuestion })
          .eq('id', existingPoll.id);

        if (updatePollError) {
          console.error('Anket güncelleme hatası:', updatePollError);
          return NextResponse.json({ error: 'Anket güncellenemedi' }, { status: 500 });
        }

        const { error: deleteOptionsError } = await supabaseServiceClient
          .from('announcement_poll_options')
          .delete()
          .eq('poll_id', existingPoll.id);

        if (deleteOptionsError) {
          console.error('Anket seçenekleri silme hatası:', deleteOptionsError);
          return NextResponse.json({ error: 'Eski anket seçenekleri silinemedi' }, { status: 500 });
        }

        const optionRows = pollOptions.map((option: string, index: number) => ({
          poll_id: existingPoll.id,
          label: option,
          position: index + 1,
        }));

        const { error: optionsError } = await supabaseServiceClient
          .from('announcement_poll_options')
          .insert(optionRows);

        if (optionsError) {
          console.error('Anket seçenekleri güncelleme hatası:', optionsError);
          return NextResponse.json({ error: 'Anket seçenekleri kaydedilemedi' }, { status: 500 });
        }
      } else {
        const { data: pollRow, error: pollError } = await supabaseServiceClient
          .from('announcement_polls')
          .insert({ announcement_id: id, question: pollQuestion })
          .select()
          .single();

        if (pollError || !pollRow) {
          console.error('Anket oluşturma hatası:', pollError);
          return NextResponse.json({ error: 'Anket oluşturulamadı' }, { status: 500 });
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
          console.error('Anket seçenekleri oluşturma hatası:', optionsError);
          return NextResponse.json({ error: 'Anket seçenekleri kaydedilemedi' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: 'Duyuru güncellendi' });
  } catch (err) {
    console.error('Admin announcements PATCH error:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireDeveloper(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || (await request.json()).id;
    if (!id) {
      return NextResponse.json({ error: 'Duyuru kimliği gerekli' }, { status: 400 });
    }

    const supabaseServiceClient = getSupabaseServiceClient();
    if (!supabaseServiceClient) {
      return NextResponse.json({ error: 'Veritabanı bağlantısı başarısız' }, { status: 500 });
    }

    const { error } = await supabaseServiceClient
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Duyuru silme hatası:', error);
      return NextResponse.json({ error: 'Duyuru silinemedi' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Duyuru silindi' });
  } catch (err) {
    console.error('Admin announcements DELETE error:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
