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
        <header className="rounded-3xl border border-[#4f545c] bg-[#2f3136] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865f2] text-2xl font-black text-white shadow-lg shadow-[#5865f2]/20">#</div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Discord Duyuru Kanalı</p>
                <h1 className="text-3xl font-black text-white sm:text-4xl">Duyuru Kanalı</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Resmi duyurular, güncellemeler ve anketler bu kanalda paylaşılır. Kanal düzenli olarak güncellenir.
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  Toplam {totalMessages} duyuru
                </p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-black/20">
              <span className="font-semibold text-slate-100">#duyuru</span>
            </div>
          </div>
        </header>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-white">Son Duyurular</h2>
            <p className="text-sm text-slate-400">Discord duyuru kanalı tarzı akıcı bir akış.</p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#4f545c] bg-[#202225] p-6 text-sm text-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              Duyurular yükleniyor...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-6 text-sm text-red-200 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-[#4f545c] bg-[#202225] p-6 text-sm text-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              Henüz duyuru bulunmuyor.
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
              <article key={message.id} className="flex gap-4 rounded-3xl bg-transparent">
                <div className="flex-shrink-0">
                  {message.author_avatar_url ? (
                    <Image
                      src={message.author_avatar_url}
                      alt={message.author_name ?? 'Author'}
                      width={48}
                      height={48}
                      className="rounded-2xl"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700 text-sm font-black text-white">
                      D
                    </div>
                  )}
                </div>
                <div className="flex-1 rounded-3xl bg-[#36393f] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {message.author_name ?? 'Discord Bot'}
                        </span>
                        <span className="rounded-full bg-[#5865f2]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                          Developer
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(message.created_at)}
                      </p>
                      <h3 className="mt-3 text-xl font-bold text-white">{message.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                      #duyuru
                    </span>
                  </div>
                  <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-200">
                    {parsed.body}
                  </div>
                </div>

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
                      <div className="relative h-[420px] w-full">
                        <Image
                          src={mediaCandidate}
                          alt="Duyuru medyasi"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
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
                  <div className="mt-5 rounded-2xl border border-[#4f545c] bg-[#202225] p-4">
                    <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                      {message.poll.question}
                    </div>
                    <div className="mt-3 grid gap-3">
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
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                                isSelected
                                  ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100'
                                  : 'border-white/10 bg-[#2f3136] text-slate-200 hover:border-white/20'
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <span>{option.label}</span>
                              <span className="text-xs text-slate-400">{option.voteCount} oy</span>
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
