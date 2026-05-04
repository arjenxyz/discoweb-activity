'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';

// ---------- types ----------
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

// ---------- helpers ----------
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

  return { body: filtered.join('\n').trim(), mediaUrl, linkUrl };
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

// ---------- component ----------
export default function DuyuruPage({ variant = 'page' }: DuyuruPageProps = {}) {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetchWithCreds(apiUrl('/api/duyuru?lang=tr'), { cache: 'no-store' });
        const data = (await res.json()) as AnnouncementResponse;
        if (!res.ok || data.error) throw new Error(data.error || 'Yüklenemedi');
        if (isMounted) setMessages(data.messages ?? []);
      } catch (e: unknown) {
        if (isMounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const totalMessages = useMemo(() => messages.length, [messages]);

  const handleVote = async (pollId: string, optionId: string) => {
    setVoteLoadingId(optionId);
    try {
      const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
      const res = await fetchWithCreds(apiUrl('/api/duyuru/vote'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pollId, optionId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Oy kaydedilemedi.');

      setMessages(prev => prev.map(msg => {
        if (!msg.poll || msg.poll.id !== pollId) return msg;
        const prevVote = msg.poll.userVoteOptionId ?? null;
        if (prevVote === optionId) return msg;

        const updated = msg.poll.options.map(opt => {
          if (opt.id === optionId) return { ...opt, voteCount: opt.voteCount + 1 };
          if (prevVote && opt.id === prevVote) return { ...opt, voteCount: Math.max(0, opt.voteCount - 1) };
          return opt;
        });

        return { ...msg, poll: { ...msg.poll, options: updated, userVoteOptionId: optionId } };
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVoteLoadingId(null);
    }
  };

  // ----- render -----
  const content = (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          {/* megaphone icon */}
          <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H5.25A2.25 2.25 0 013 13.5V9.75A2.25 2.25 0 015.25 7.5h2.5c.704 0 1.402-.03 2.09-.09m0 0c1.535-.148 2.947-.576 4.16-1.25M10.34 15.84l4.16-1.25m0 0A6.75 6.75 0 0021 7.5a6.75 6.75 0 00-6.5-7.09" />
          </svg>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Duyuru Panosu
          </h1>
        </div>
        <p className="text-base text-gray-500 max-w-2xl">
          Güncel duyurular, geliştirici notları ve topluluk anketleri burada yayınlanır.
        </p>
        {totalMessages > 0 && (
          <p className="mt-1 text-sm text-gray-400">{totalMessages} duyuru listeleniyor</p>
        )}
      </div>

      {/* loading / error / empty */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin h-8 w-8 mb-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Duyurular yükleniyor…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Bir hata oluştu</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
          Henüz hiç duyuru yayınlanmadı.
        </div>
      )}

      {/* announcement list */}
      {!loading && !error && messages.length > 0 && (
        <div className="space-y-8">
          {messages.map((msg) => {
            const parsed = parseAnnouncementBody(msg.body);
            const youtubeEmbed = getYouTubeEmbedUrl(parsed.mediaUrl) ?? getYouTubeEmbedUrl(parsed.linkUrl);
            const mediaKey = `${msg.id}:${parsed.mediaUrl || parsed.linkUrl}`;
            const mediaFailed = mediaErrors[mediaKey];
            const pollTotal = msg.poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;

            return (
              <article key={msg.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                {/* meta */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    {msg.author_avatar_url ? (
                      <Image src={msg.author_avatar_url} alt={msg.author_name ?? ''} width={44} height={44} className="rounded-full ring-2 ring-indigo-100" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        D
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 leading-snug">{msg.title}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {msg.author_name ?? 'Sistem'} · {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                    duyuru
                  </span>
                </div>

                {/* body text */}
                {parsed.body && (
                  <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {parsed.body}
                  </div>
                )}

                {/* media */}
                {youtubeEmbed ? (
                  <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <div className="aspect-video">
                      <iframe src={youtubeEmbed} title="YouTube" allowFullScreen className="h-full w-full" />
                    </div>
                  </div>
                ) : parsed.mediaUrl ? (
                  <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {isVideoUrl(parsed.mediaUrl) ? (
                      <video src={parsed.mediaUrl} controls className="w-full max-h-96 object-contain" onError={() => setMediaErrors(prev => ({ ...prev, [mediaKey]: true }))} />
                    ) : (
                      <div className="relative h-96 w-full">
                        <Image
                          src={parsed.mediaUrl}
                          alt="medya"
                          fill
                          className="object-contain"
                          unoptimized
                          onError={() => setMediaErrors(prev => ({ ...prev, [mediaKey]: true }))}
                        />
                      </div>
                    )}
                    {mediaFailed && (
                      <div className="bg-gray-100 px-4 py-3 text-xs text-gray-500">Medya yüklenemedi. Bağlantı süresi dolmuş olabilir.</div>
                    )}
                  </div>
                ) : null}

                {/* link */}
                {parsed.linkUrl && (
                  <a href={parsed.linkUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.06 6.31l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m6.364-1.06a4.5 4.5 0 00-1.06-6.31l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L3.19 9.69" /></svg>
                    {parsed.linkUrl}
                  </a>
                )}

                {/* poll */}
                {msg.poll && (
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                    <p className="text-sm font-semibold text-gray-800 mb-4">{msg.poll.question}</p>
                    <div className="space-y-3">
                      {msg.poll.options
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map(opt => {
                          const selected = msg.poll!.userVoteOptionId === opt.id;
                          const percentage = pollTotal > 0 ? Math.round((opt.voteCount / pollTotal) * 100) : 0;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleVote(msg.poll!.id, opt.id)}
                              disabled={voteLoadingId === opt.id}
                              className={`group relative w-full rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                selected
                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200'
                              }`}
                            >
                              <div className="flex items-center justify-between relative z-10">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-gray-500">{opt.voteCount} oy {percentage > 0 && `(%${percentage})`}</span>
                              </div>
                              {/* progress bar */}
                              <div className="absolute inset-0 rounded-lg overflow-hidden z-0">
                                <div
                                  className={`h-full transition-all duration-500 ${selected ? 'bg-indigo-100' : 'bg-gray-100 group-hover:bg-gray-200'}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  // variant handling (page: full background, panel: just content)
  if (variant === 'panel') {
    return <div className="min-h-0">{content}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      {content}
    </div>
  );
}