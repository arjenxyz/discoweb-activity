'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

type AnnouncementMessage = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
};

type AnnouncementResponse = {
  messages?: AnnouncementMessage[];
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildAnnouncementBody({
  content,
  mediaUrl,
  linkUrl,
  pollQuestion,
  pollOptions,
  extraContent,
}: {
  content: string;
  mediaUrl: string;
  linkUrl: string;
  pollQuestion: string;
  pollOptions: string;
  extraContent: string;
}) {
  const sections: string[] = [content.trim()];

  if (mediaUrl.trim()) {
    sections.push(`Medya: ${mediaUrl.trim()}`);
  }

  if (linkUrl.trim()) {
    sections.push(`Link: ${linkUrl.trim()}`);
  }

  if (pollQuestion.trim()) {
    const options = pollOptions
      .split('\n')
      .map((option) => option.trim())
      .filter(Boolean);
    const pollLines = [
      `Anket: ${pollQuestion.trim()}`,
      ...options.map((option) => `- ${option}`),
    ];
    sections.push(pollLines.join('\n'));
  }

  if (extraContent.trim()) {
    sections.push(extraContent.trim());
  }

  return sections.filter(Boolean).join('\n\n');
}

export default function DuyuruPage() {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [extraContent, setExtraContent] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const response = await fetch('/api/duyuru?lang=tr', { cache: 'no-store' });
        const data = (await response.json()) as AnnouncementResponse;
        if (!response.ok || data.error) {
          throw new Error(data.error || 'Duyurular yuklenemedi.');
        }
        if (isMounted) {
          setMessages(data.messages ?? []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Duyurular yuklenemedi.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const checkDeveloper = async () => {
      try {
        const token = (() => {
          try {
            return localStorage.getItem('discord_bearer_token');
          } catch {
            return null;
          }
        })();

        const response = await fetch('/api/activity/is-developer', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = (await response.json()) as { isDeveloper?: boolean };
        if (isMounted) {
          setIsDeveloper(Boolean(data?.isDeveloper));
        }
      } catch {
        if (isMounted) {
          setIsDeveloper(false);
        }
      }
    };

    loadMessages();
    checkDeveloper();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setSendStatus('Baslik ve mesaj icerigi zorunlu.');
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      const token = (() => {
        try {
          return localStorage.getItem('discord_bearer_token');
        } catch {
          return null;
        }
      })();

      const body = buildAnnouncementBody({
        content,
        mediaUrl,
        linkUrl,
        pollQuestion,
        pollOptions,
        extraContent,
      });

      const response = await fetch('/api/duyuru', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: title.trim(), body, lang: 'tr' }),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Duyuru gonderilemedi.');
      }

      setSendStatus(data.message || 'Duyuru basariyla gonderildi.');
      setTitle('');
      setContent('');
      setMediaUrl('');
      setLinkUrl('');
      setPollQuestion('');
      setPollOptions('');
      setExtraContent('');

      const refreshed = await fetch('/api/duyuru?lang=tr', { cache: 'no-store' });
      const refreshedData = (await refreshed.json()) as AnnouncementResponse;
      if (refreshed.ok && !refreshedData.error) {
        setMessages(refreshedData.messages ?? []);
      }
    } catch (err) {
      setSendStatus(err instanceof Error ? err.message : 'Duyuru gonderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const totalMessages = useMemo(() => messages.length, [messages.length]);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 z-0">
        <Image
          src="/menu-background/varyant6.jpg"
          alt="Duyuru arka plan"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(244,63,94,0.16),transparent_24%),linear-gradient(180deg,rgba(7,11,19,0.92),rgba(7,11,19,1))]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Duyuru Kanali</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Bu kanal herkes tarafindan gorulebilir. Yalnizca gelistirici duyuru
            gonderebilir.
          </p>
          <div className="text-xs text-slate-400">Toplam duyuru: {totalMessages}</div>
        </header>

        {isDeveloper ? (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Yeni Duyuru</h2>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Gelistirici Modu
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-300">Baslik</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Duyuru basligi"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-300">Mesaj</label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Duyuru metni"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-300">Medya URL</label>
                  <input
                    value={mediaUrl}
                    onChange={(event) => setMediaUrl(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-300">Link</label>
                  <input
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-300">Anket Sorusu</label>
                  <input
                    value={pollQuestion}
                    onChange={(event) => setPollQuestion(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                    placeholder="Ornek: Yeni ozellik begenildi mi?"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-slate-300">Anket Secenekleri</label>
                  <textarea
                    value={pollOptions}
                    onChange={(event) => setPollOptions(event.target.value)}
                    className="min-h-[80px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                    placeholder="Her secenegi yeni satira yazin"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-300">Ek Icerik (Markdown)</label>
                <textarea
                  value={extraContent}
                  onChange={(event) => setExtraContent(event.target.value)}
                  className="min-h-[90px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Form, duyuru sablonu veya ozel notlar ekleyin"
                />
              </div>

              {sendStatus ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  {sendStatus}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-[#5865F2] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_12px_32px_rgba(88,101,242,0.4)] transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Gonderiliyor...' : 'Duyuru Gonder'}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Duyuru gondermek icin gelistirici yetkisi gerekir.
          </section>
        )}

        <section className="grid gap-4">
          <h2 className="text-lg font-bold text-white">Son Duyurular</h2>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              Duyurular yukleniyor...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-200">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              Henuz duyuru bulunmuyor.
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.25)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{message.title}</h3>
                    <div className="mt-2 text-xs text-slate-400">
                      {formatDate(message.created_at)}
                    </div>
                  </div>
                  {message.author_avatar_url ? (
                    <Image
                      src={message.author_avatar_url}
                      alt={message.author_name ?? 'Author'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : null}
                </div>
                <p className="mt-4 whitespace-pre-line text-sm text-slate-200">
                  {message.body}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
