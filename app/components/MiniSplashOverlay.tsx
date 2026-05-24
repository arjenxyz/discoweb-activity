'use client';

import { useEffect, useState } from 'react';

const MINI_W = 340;
const MINI_H = 300;

const logoWhite: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(105deg,#fff 0%,#fff 35%,rgba(255,255,255,0.9) 45%,#fff 55%,#fff 100%)',
  backgroundSize: '300% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: 'miniShine 4s ease-in-out infinite',
};

const logoBlue: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(105deg,#5865F2 0%,#5865F2 35%,#a5b4ff 45%,#5865F2 55%,#5865F2 100%)',
  backgroundSize: '300% 100%',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  animation: 'miniShine 4s ease-in-out infinite',
};

export default function MiniSplashOverlay() {
  const [isMini, setIsMini] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => {
      setIsMini(window.innerWidth < MINI_W || window.innerHeight < MINI_H);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes miniShine {
          0%,60% { background-position: 100% 0 }
          100% { background-position: -100% 0 }
        }
        @keyframes miniPulse {
          0%,100% { opacity: 0.3 }
          50% { opacity: 0.6 }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0d12',
          gap: 6,
          pointerEvents: isMini ? 'auto' : 'none',
          opacity: isMini ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <span
          style={{
            ...logoWhite,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          Disco<span style={logoBlue}>Web</span>
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.28)',
            animation: 'miniPulse 3s ease-in-out infinite',
          }}
        >
          Discord Activity
        </span>
      </div>
    </>
  );
}
