'use client';

import { useRef, useState } from 'react';

const videoUrl = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL ?? null;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  return (
    <div className="relative min-h-screen text-white">
      {/* Arka plan — fixed, hiç unmount olmaz, içerik boyutundan etkilenmez */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          className="pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover"
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[#0b0d12] bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />
      )}

      {/* Overlay — fixed */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Ses butonu */}
      {videoUrl && (
        <button
          type="button"
          onClick={toggleMute}
          className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
          aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
              <line x1="18" y1="9" x2="23" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="23" y1="9" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
              <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
      )}

      {/* İçerik */}
      {children}
    </div>
  );
}
