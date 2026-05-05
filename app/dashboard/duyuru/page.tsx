'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';

// ---------- types (unchanged) ----------
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
function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Bugün ${time}`;
  if (diffDays === 1) return `Dün ${time}`;
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }) + ` ${time}`;
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
    return () => {
      isMounted = false;
    };
  }, []);

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
      const res = await fetchWithCreds(apiUrl('/api/duyuru/vote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pollId, optionId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Oy kaydedilemedi.');

      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.poll || msg.poll.id !== pollId) return msg;
          const prevVote = msg.poll.userVoteOptionId ?? null;
          if (prevVote === optionId) return msg;

          const updated = msg.poll.options.map((opt) => {
            if (opt.id === optionId) return { ...opt, voteCount: opt.voteCount + 1 };
            if (prevVote && opt.id === prevVote) return { ...opt, voteCount: Math.max(0, opt.voteCount - 1) };
            return opt;
          });

          return {
            ...msg,
            poll: { ...msg.poll, options: updated, userVoteOptionId: optionId },
          };
        })
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVoteLoadingId(null);
    }
  };

  // ----- render -----
  const content = (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* loading / error / empty – dark mode */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
          <svg
            className="animate-spin h-8 w-8 mb-3 text-[#5865f2]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Duyurular yükleniyor…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 p-4 text-sm text-[#ed4245]">
          <p className="font-semibold">Bir hata oluştu</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="rounded-lg bg-[#2b2d31] p-8 text-center text-sm text-[#949ba4]">
          Henüz hiç duyuru yayınlanmadı.
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="space-y-6">
          {messages.map((msg) => {
            const parsed = parseAnnouncementBody(msg.body);
            const youtubeEmbed =
              getYouTubeEmbedUrl(parsed.mediaUrl) ?? getYouTubeEmbedUrl(parsed.linkUrl);
            const mediaKey = `${msg.id}:${parsed.mediaUrl || parsed.linkUrl}`;
            const mediaFailed = mediaErrors[mediaKey];
            const pollTotal = msg.poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;

            return (
              <div key={msg.id} className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  {msg.author_avatar_url ? (
                    <Image
                      src={msg.author_avatar_url}
                      alt={msg.author_name ?? 'Developer'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865f2] text-sm font-semibold text-white">
                      DV
                    </div>
                  )}
                </div>

                {/* Message body */}
                <div className="min-w-0 flex-1">
                  {/* Author & timestamp */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[#f0b236]">
                      {msg.author_name ?? 'Developer'}
                    </span>
                    <span className="text-xs text-[#949ba4]">
                      {formatRelativeDate(msg.created_at)}
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="mt-1 text-sm leading-7 text-[#dbdee1]">
                    {msg.title && (
                      <p className="font-semibold text-[#dbdee1]">{msg.title}</p>
                    )}
                    {parsed.body && (
                      <p className="whitespace-pre-line">{parsed.body}</p>
                    )}
                  </div>

                  {/* YouTube embed */}
                  {youtubeEmbed ? (
                    <div className="mt-3 overflow-hidden rounded-lg border-l-4 border-[#5865f2] bg-[#2b2d31]">
                      <div className="aspect-video">
                        <iframe
                          src={youtubeEmbed}
                          title="YouTube"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    </div>
                  ) : parsed.mediaUrl ? (
                    /* Media embed (image/video) */
                    <div className="mt-3 rounded-r-lg border-l-4 border-[#5865f2] bg-[#2b2d31] p-3">
                      {isVideoUrl(parsed.mediaUrl) ? (
                        <video
                          src={parsed.mediaUrl}
                          controls
                          className="max-h-80 w-full rounded object-contain"
                          onError={() =>
                            setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))
                          }
                        />
                      ) : (
                        <div className="relative h-80 w-full">
                          <Image
                            src={parsed.mediaUrl}
                            alt="medya"
                            fill
                            className="rounded object-contain"
                            unoptimized
                            onError={() =>
                              setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))
                            }
                          />
                        </div>
                      )}
                      {mediaFailed && (
                        <div className="mt-2 rounded bg-[#1e1f22] px-3 py-2 text-xs text-[#949ba4]">
                          Medya yüklenemedi. Bağlantı süresi dolmuş olabilir.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Link */}
                  {parsed.linkUrl && (
                    <a
                      href={parsed.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded bg-[#2b2d31] px-3 py-1.5 text-sm text-[#00a8fc] underline-offset-2 hover:underline"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.19 8.688a4.5 4.5 0 011.06 6.31l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m6.364-1.06a4.5 4.5 0 00-1.06-6.31l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L3.19 9.69"
                        />
                      </svg>
                      {parsed.linkUrl}
                    </a>
                  )}

                  {/* Poll */}
                  {msg.poll && (
                    <div className="mt-4 rounded-lg bg-[#2b2d31] p-4">
                      <p className="mb-3 text-sm font-semibold text-[#dbdee1]">
                        {msg.poll.question}
                      </p>
                      <div className="space-y-2">
                        {msg.poll.options
                          .slice()
                          .sort((a, b) => a.position - b.position)
                          .map((opt) => {
                            const selected = msg.poll!.userVoteOptionId === opt.id;
                            const percentage =
                              pollTotal > 0
                                ? Math.round((opt.voteCount / pollTotal) * 100)
                                : 0;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleVote(msg.poll!.id, opt.id)}
                                disabled={voteLoadingId === opt.id}
                                className={`group relative w-full overflow-hidden rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  selected
                                    ? 'bg-[#5865f2]/20 ring-1 ring-[#5865f2]'
                                    : 'bg-[#1e1f22] hover:bg-[#313338]'
                                }`}
                              >
                                {/* Progress bar background */}
                                <div
                                  className={`absolute inset-0 transition-all duration-300 ${
                                    selected ? 'bg-[#5865f2]/10' : 'bg-[#3b3d44]/30'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="font-medium text-[#dbdee1]">
                                    {opt.label}
                                  </span>
                                  <span className="text-xs text-[#949ba4]">
                                    {opt.voteCount} oy
                                    {percentage > 0 && ` (%${percentage})`}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ----- variant handling -----
  if (variant === 'panel') {
    return (
      <div className="rounded-xl bg-[#313338] shadow-2xl">
        {content}
      </div>
    );
  }

  // full page
  return (
    <div className="min-h-screen bg-[#313338]">
      {content}
    </div>
  );
}