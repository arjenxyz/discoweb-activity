'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { LuCircleCheck } from 'react-icons/lu';

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

  if (diffDays === 0) return `Bugün saat ${time}`;
  if (diffDays === 1) return `Dün saat ${time}`;
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ` ${time}`;
}

function parseAnnouncementBody(body: string) {
  const lines = body.split('\n');
  const mediaUrls: string[] = [];
  const linkUrls: string[] = [];
  const filtered: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().startsWith('medya:')) {
      mediaUrls.push(trimmed.slice(6).trim());
      return;
    }
    if (trimmed.toLowerCase().startsWith('link:')) {
      linkUrls.push(trimmed.slice(5).trim());
      return;
    }
    filtered.push(line);
  });

  return { body: filtered.join('\n').trim(), mediaUrls, linkUrls };
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url);
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|avi|ogg|ogv)(\?.*)?$/i.test(url);
}

function getEmbeddableVideoUrl(url: string) {
  if (!url) return null;
  return isVideoUrl(url) ? url : null;
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

// ----- Link Preview (Open Graph Embed) -----
function LinkPreviewEmbed({ url }: { url: string }) {
  const [og, setOg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/og-preview?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data && !data.error) setOg(data);
        if (isMounted) setLoading(false);
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return <div className="mt-2 h-20 w-80 animate-pulse rounded-xl bg-white/[0.05]"></div>;
  if (!og || (!og.title && !og.image && !og.description)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-white/60 hover:text-white hover:underline break-all transition-colors">
        {url}
      </a>
    );
  }

  return (
    <div className="mt-2 flex max-w-[520px] overflow-hidden rounded-xl bg-white/[0.05] border border-white/[0.07]">
      <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: og.themeColor || 'rgba(255,255,255,0.15)' }} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {og.siteName && <span className="text-xs font-semibold text-white/40">{og.siteName}</span>}
        {og.title && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:underline line-clamp-2">
            {og.title}
          </a>
        )}
        {og.description && (
          <p className="text-sm text-white/60 line-clamp-3">{og.description}</p>
        )}
        {og.image && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={og.image} alt={og.title || 'Embed Image'} className="max-h-[300px] max-w-full rounded-lg object-contain bg-white/[0.05]" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- component ----------
export default function DuyuruPage({ variant = 'page' }: DuyuruPageProps = {}) {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, boolean>>({});
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        if (isMounted) {
          try {
            setLastSeenAt(localStorage.getItem('duyuru_last_seen_at'));
          } catch {
            setLastSeenAt(null);
          }
        }
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

  useEffect(() => {
    if (!messages.length) return;
    const newest = messages
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!newest?.created_at) return;
    try {
      localStorage.setItem('duyuru_last_seen_at', newest.created_at);
    } catch {
      // Ignore localStorage errors
    }
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return messages
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);

  const newDividerIndex = useMemo(() => {
    if (!lastSeenAt) return -1;
    const lastSeenTime = new Date(lastSeenAt).getTime();
    if (Number.isNaN(lastSeenTime)) return -1;
    return sortedMessages.findIndex((msg) => new Date(msg.created_at).getTime() > lastSeenTime);
  }, [lastSeenAt, sortedMessages]);

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
    <div className="w-full flex-1">
      {/* loading / error / empty */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-white/40">
          <svg className="mb-3 h-8 w-8 animate-spin text-white/30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Mesajlar yükleniyor...</span>
        </div>
      )}

      {!loading && error && (
        <div className="mx-4 my-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">Bir hata oluştu</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-sm text-white/30">
          Henüz buralar çok sessiz...
        </div>
      )}

      {!loading && !error && sortedMessages.length > 0 && (
        <div className="flex flex-col pb-4">
          {sortedMessages.map((msg, index) => {
            const parsed = parseAnnouncementBody(msg.body);

            const renderMediaList = [...parsed.mediaUrls, ...parsed.linkUrls].map((url, i) => {
              const youtubeEmbed = getYouTubeEmbedUrl(url);
              const embeddableVideoUrl = getEmbeddableVideoUrl(url);
              const mediaKey = `${msg.id}:${url}:${i}`;
              const mediaFailed = mediaErrors[mediaKey];

              if (youtubeEmbed) {
                return (
                  <div key={mediaKey} className="mt-2 max-w-[520px] overflow-hidden rounded-xl bg-white/[0.05]">
                    <div className="aspect-video">
                      <iframe src={youtubeEmbed} title="YouTube" allowFullScreen className="h-full w-full border-0" />
                    </div>
                  </div>
                );
              }
              if (embeddableVideoUrl) {
                return (
                  <div key={mediaKey} className="mt-2 max-w-[520px] rounded-xl bg-white/[0.05] p-2">
                    <video
                      src={embeddableVideoUrl}
                      controls
                      playsInline
                      className="max-h-[350px] w-full rounded-lg object-contain"
                      onError={() => setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))}
                    />
                    {mediaFailed && (
                      <div className="mt-2 text-xs text-red-400">Medya oynatılamadı.</div>
                    )}
                  </div>
                );
              }
              if (parsed.mediaUrls.includes(url) || isImageUrl(url)) {
                return (
                  <div key={mediaKey} className="mt-2">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Medya eklentisi"
                        className="max-h-[350px] max-w-[400px] rounded-xl object-contain bg-white/[0.05]"
                        onError={() => setMediaErrors((prev) => ({ ...prev, [mediaKey]: true }))}
                      />
                    </a>
                    {mediaFailed && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-white/50 hover:text-white underline break-all">
                        Medya yüklenemedi — bağlantıyı aç
                      </a>
                    )}
                  </div>
                );
              }
              return <LinkPreviewEmbed key={mediaKey} url={url} />;
            });

            const pollTotal = msg.poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;
            const isSystem = msg.author_name?.toLowerCase() === 'system';
            const authorName = isSystem ? 'DiscoWeb' : (msg.author_name || 'Geliştirici');
            const authorAvatar = msg.author_avatar_url || '/logo.png';

            return (
              <div key={msg.id} className={`relative group hover:bg-white/[0.03] px-4 py-2 transition-colors ${index === 0 ? 'mt-0' : 'mt-[17px]'}`}>

                {/* New Divider Line */}
                {newDividerIndex === index && (
                  <div className="absolute top-0 left-0 right-0 -mt-[17px] flex items-center px-4">
                    <div className="h-[1px] flex-1 bg-red-500/60" />
                    <span className="mx-2 text-xs font-bold text-red-400">YENİ MESAJLAR</span>
                    <div className="h-[1px] flex-1 bg-red-500/60" />
                  </div>
                )}

                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="mt-1 flex-shrink-0">
                    <Image
                      src={authorAvatar}
                      alt={authorName}
                      width={40}
                      height={40}
                      className="rounded-full bg-white/10 hover:opacity-80 transition"
                      unoptimized
                    />
                  </div>

                  {/* Message Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end gap-2 leading-tight">
                      <span className="font-semibold text-white">
                        {authorName}
                      </span>
                      {isSystem && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-[2px] text-[10px] font-bold text-white/80">
                          <LuCircleCheck className="h-3 w-3" />
                          DEVELOPER
                        </span>
                      )}
                      <span className="ml-1 text-xs font-medium text-white/35">
                        {formatRelativeDate(msg.created_at)}
                      </span>
                    </div>

                    <div className="mt-1 space-y-1 text-sm leading-[1.375rem] text-white/70">
                      {msg.title && (
                        <h3 className="font-bold text-white text-[15px]">{msg.title}</h3>
                      )}
                      {parsed.body && (
                        <div className="whitespace-pre-wrap">{parsed.body}</div>
                      )}
                    </div>

                    {renderMediaList.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        {renderMediaList}
                      </div>
                    )}

                    {msg.poll && (
                      <div className="mt-3 max-w-[520px] rounded-xl border border-white/10 bg-white/[0.05] p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-sm font-semibold text-white/50">Anket:</span>
                          <span className="text-[15px] font-bold text-white">{msg.poll.question}</span>
                        </div>
                        <div className="space-y-2">
                          {msg.poll.options
                            .slice()
                            .sort((a, b) => a.position - b.position)
                            .map((opt) => {
                              const selected = msg.poll!.userVoteOptionId === opt.id;
                              const percentage = pollTotal > 0 ? Math.round((opt.voteCount / pollTotal) * 100) : 0;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleVote(msg.poll!.id, opt.id)}
                                  disabled={voteLoadingId === opt.id}
                                  className="relative flex w-full items-center justify-between overflow-hidden rounded-lg bg-white/[0.05] p-3 text-left transition hover:bg-white/[0.09] disabled:cursor-not-allowed"
                                >
                                  <div
                                    className={`absolute inset-0 transition-all duration-500 ease-out rounded-lg ${selected ? 'bg-white/10' : 'bg-white/[0.03]'}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                  <div className="relative z-10 flex items-center gap-3">
                                    <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${selected ? 'border-white/60' : 'border-white/20'}`}>
                                      {selected && <div className="h-2 w-2 rounded-full bg-white/80" />}
                                    </div>
                                    <span className={`text-[15px] font-medium ${selected ? 'text-white' : 'text-white/70'}`}>
                                      {opt.label}
                                    </span>
                                  </div>
                                  <span className="relative z-10 text-xs font-semibold text-white/40">
                                    {percentage}% ({opt.voteCount})
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                        <div className="mt-3 text-xs text-white/30">
                          Toplam {pollTotal} oy kullanıldı
                        </div>
                      </div>
                    )}
                  </div>
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
      <div className="flex h-full w-full flex-col">
        {content}
      </div>
    );
  }

  // full page
  return (
    <div className="min-h-screen text-white/80">
      <div className="mx-auto max-w-4xl">
        <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-white/[0.07] bg-[#0e1018]/95 px-4 backdrop-blur-md">
          <svg className="h-5 w-5 shrink-0 text-white/30" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4405 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0305 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36323 20.5874C7.32086 20.8261 7.11336 21 6.87093 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z" />
          </svg>
          <span className="text-[15px] font-semibold text-white/80">duyurular</span>
        </div>
        {content}
      </div>
    </div>
  );
}