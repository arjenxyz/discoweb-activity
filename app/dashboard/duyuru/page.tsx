'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';

type AnnouncementMessage = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  poll?: AnnouncementPoll | null;
};

type AnnouncementPollOption = {
  id: string;
  label: string;
  position: number;
  voteCount: number;
};

type AnnouncementPoll = {
  id: string;
  question: string;
  options: AnnouncementPollOption[];
  userVoteOptionId?: string | null;
};

type AnnouncementResponse = {
  messages?: AnnouncementMessage[];
  error?: string;
};

type DuyuruPageProps = {
  variant?: 'page' | 'panel';
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

function parseAnnouncementBody(body: string) {
  const lines = body.split('\n');
  let mediaUrl = '';
  let linkUrl = '';
  const filtered: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('medya:')) {
      mediaUrl = trimmed.slice(6).trim();
      return;
    }
    if (trimmed.toLowerCase().startsWith('link:')) {
      linkUrl = trimmed.slice(5).trim();
      return;
    }
    filtered.push(line);
  });

  return {
    body: filtered.join('\n').trim(),
    mediaUrl,
    linkUrl,
  };
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|avi)(\?.*)?$/i.test(url);
}

function getYouTubeEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.endsWith('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/embed/')[1]?.split('/')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/shorts/')[1]?.split('/')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function DuyuruPage({ variant = 'page' }: DuyuruPageProps = {}) {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const response = await fetchWithCreds(apiUrl('/api/duyuru?lang=tr'), { cache: 'no-store' });
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

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalMessages = useMemo(() => messages.length, [messages.length]);

  const handleVote = async (pollId: string, optionId: string) => {
    setVoteLoadingId(optionId);
    try {
      const token = (() => {
        try {
          return localStorage.getItem('discord_bearer_token');
        } catch {
          return null;
        }
      })();

      const response = await fetchWithCreds(apiUrl('/api/duyuru/vote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pollId, optionId }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Oy kaydedilemedi.');
      }

      setMessages((prev) =>
        prev.map((message) => {
          if (!message.poll || message.poll.id !== pollId) return message;
          const previousVote = message.poll.userVoteOptionId ?? null;
          if (previousVote === optionId) return message;

          const updatedOptions = message.poll.options.map((option) => {
            if (option.id === optionId) {
              return { ...option, voteCount: option.voteCount + 1 };
            }
            if (previousVote && option.id === previousVote) {
              return { ...option, voteCount: Math.max(0, option.voteCount - 1) };
            }
            return option;
          });

          return {
            ...message,
            poll: {
              ...message.poll,
              options: updatedOptions,
              userVoteOptionId: optionId,
            },
          };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oy kaydedilemedi.');
    } finally {
      setVoteLoadingId(null);
    }
  };

  const content = (
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Duyuru Kanali</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Bu kanal herkes tarafından görüntülenebilir. Duyurular herkese açıktır.
          </p>
          <div className="text-xs text-slate-400">Toplam duyuru: {totalMessages}</div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          Duyuru göndermek için geliştirici yetkisi gerekir. Tüm yönetim işlemleri geliştirici panelinden yapılmalıdır.
        </section>

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
            messages.map((message) => {
              const parsed = parseAnnouncementBody(message.body);
              const mediaCandidate = parsed.mediaUrl;
              const linkCandidate = parsed.linkUrl;
              const youtubeEmbed =
                getYouTubeEmbedUrl(mediaCandidate) ?? getYouTubeEmbedUrl(linkCandidate);
              const mediaKey = `${message.id}:${mediaCandidate || linkCandidate}`;
              const mediaFailed = Boolean(mediaErrors[mediaKey]);
              return (
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
                  {parsed.body}
                </p>

                {youtubeEmbed ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <div className="aspect-video w-full">
                      <iframe
                        src={youtubeEmbed}
                        title="YouTube"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                ) : mediaCandidate ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    {isVideoUrl(mediaCandidate) ? (
                      <video
                        src={mediaCandidate}
                        controls
                        className="w-full max-h-[420px] object-contain"
                        onError={() =>
                          setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))
                        }
                      />
                    ) : (
                      <img
                        src={mediaCandidate}
                        alt="Duyuru medyasi"
                        className="w-full max-h-[420px] object-contain"
                        onError={() =>
                          setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))
                        }
                      />
                    )}
                    {mediaFailed ? (
                      <div className="border-t border-white/10 bg-black/50 px-4 py-3 text-xs text-slate-300">
                        Medya yuklenemedi. Discord linklerinin suresi dolmus olabilir.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {parsed.linkUrl ? (
                  <a
                    href={parsed.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-200 transition hover:border-sky-300 hover:text-white"
                  >
                    {parsed.linkUrl}
                  </a>
                ) : null}

                {message.poll ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-sm font-semibold text-white">
                      {message.poll.question}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {message.poll.options
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((option) => {
                          const isSelected = message.poll?.userVoteOptionId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleVote(message.poll!.id, option.id)}
                              disabled={voteLoadingId === option.id}
                              className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-left text-sm transition ${
                                isSelected
                                  ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
                                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <span>{option.label}</span>
                              <span className="text-xs text-slate-300">{option.voteCount} oy</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </article>
              );
            })
          )}
        </section>
      </div>
  );

  if (variant === 'panel') {
    return <div className="min-h-0">{content}</div>;
  }

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
      {content}
    </div>
  );
}
