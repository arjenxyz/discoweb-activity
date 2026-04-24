import type { RefObject } from 'react';

const DEFAULT_VIDEO_URL = '/cdn/Storage/Thragg.mp4';

type VideoBackgroundProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videoRef: RefObject<any>;
  src?: string | null;
};

export function VideoBackground({ videoRef, src }: VideoBackgroundProps) {
  const videoUrl = src !== undefined ? src : DEFAULT_VIDEO_URL;
  return (
    <>
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
          disablePictureInPicture
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
    </>
  );
}

type MuteButtonProps = {
  muted: boolean;
  onToggle: () => void;
};

export function MuteButton({ muted, onToggle, src }: MuteButtonProps & { src?: string | null }) {
  const videoUrl = src !== undefined ? src : DEFAULT_VIDEO_URL;
  if (!videoUrl) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 backdrop-blur-sm transition hover:bg-black/35 hover:text-white"
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
          <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z" />
          <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      )}
    </button>
  );
}
