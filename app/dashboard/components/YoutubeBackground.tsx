'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  videoId: string;
}

export default function YoutubeBackground({ videoId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [muted, setMuted] = useState(true);

  // YouTube IFrame API ile ses kontrolü
  const postMessage = (data: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(data), '*');
  };

  const toggleMute = () => {
    if (muted) {
      postMessage({ event: 'command', func: 'unMute', args: [] });
      postMessage({ event: 'command', func: 'setVolume', args: [80] });
    } else {
      postMessage({ event: 'command', func: 'mute', args: [] });
    }
    setMuted(prev => !prev);
  };

  // YouTube Player Ready geldiğinde play et
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'onReady') {
          postMessage({ event: 'command', func: 'playVideo', args: [] });
          postMessage({ event: 'command', func: 'mute', args: [] });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const src =
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&mute=1&loop=1&playlist=${videoId}` +
    `&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1` +
    `&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`;

  return (
    <>
      {/* YouTube iframe — pointer-events yok, etkileşim tamamen devre dışı */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={src}
          allow="autoplay; encrypted-media"
          className="absolute"
          style={{
            /* 16:9 videoyu her ekrana taşırmak için: en az width/height %100 */
            top: '50%',
            left: '50%',
            width: 'max(100%, calc(100vh * 16 / 9))',
            height: 'max(100%, calc(100vw * 9 / 16))',
            transform: 'translate(-50%, -50%)',
            border: 'none',
            objectFit: 'cover',
          }}
          title=""
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Karartma overlay */}
      <div className="pointer-events-none absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      {/* Ses butonu — sağ üst */}
      <button
        type="button"
        onClick={toggleMute}
        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
        aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
      >
        {muted ? (
          /* Sessiz ikonu */
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586zM3 10a2 2 0 012-2h2.586l5.707-5.707A1 1 0 0115 3v18a1 1 0 01-1.707.707L7.586 16H5a2 2 0 01-2-2v-4z" />
            <line x1="18" y1="9" x2="23" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="23" y1="9" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          /* Sesli ikonu */
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586zM3 10a2 2 0 012-2h2.586l5.707-5.707A1 1 0 0115 3v18a1 1 0 01-1.707.707L7.586 16H5a2 2 0 01-2-2v-4z" />
            <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </button>
    </>
  );
}
