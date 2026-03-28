'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MuteButton, VideoBackground } from './VideoBackground';
import DeveloperAboutModal from './DeveloperAboutModal';
import SupportMenu from './SupportMenu';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { getDiscordSdk } from '@/lib/discordSdk';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  onEnter: () => void;
};

const TIPS = [
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M8.75 2.75a.75.75 0 00-1.5 0v5.69L5.03 6.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06L8.75 8.44V2.75z" />
        <path d="M3.5 9.75a.75.75 0 00-1.5 0v1.5A2.75 2.75 0 004.75 14h6.5A2.75 2.75 0 0014 11.25v-1.5a.75.75 0 00-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5z" />
      </svg>
    ),
    text: 'Mesaj atarak ve sesli kanalda vakit geçirerek Papel kazanabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M1.5 2A1.5 1.5 0 000 3.5v2A1.5 1.5 0 001.5 7h13A1.5 1.5 0 0016 5.5v-2A1.5 1.5 0 0014.5 2h-13zM0 10.5A1.5 1.5 0 011.5 9h13a1.5 1.5 0 010 3h-13A1.5 1.5 0 010 10.5z" />
      </svg>
    ),
    text: 'DiscoWeb Market\'te sunucu hisseleri alıp satabilir, portföy oluşturabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M2.5 3A1.5 1.5 0 001 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0115 5.293V4.5A1.5 1.5 0 0013.5 3h-11z" />
        <path d="M15 6.954L8.978 9.86a2.25 2.25 0 01-1.956 0L1 6.954V11.5A1.5 1.5 0 002.5 13h11a1.5 1.5 0 001.5-1.5V6.954z" />
      </svg>
    ),
    text: 'Posta kutunda seni bekleyen ödüller ve sistem bildirimleri olabilir.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
      </svg>
    ),
    text: 'Papel\'ini evrensel para birimi Mari\'ye dönüştürerek farklı sunucularda kullanabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M3.75 2a.75.75 0 00-.75.75v10.5a.75.75 0 001.28.53L8 10.06l3.72 3.72a.75.75 0 001.28-.53V2.75a.75.75 0 00-.75-.75h-8.5z" />
      </svg>
    ),
    text: 'Aktif olarak rozet günleri biriktirerek özel etiketler ve ödüller kazanabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
      </svg>
    ),
    text: 'Arkadaşlarını davet et, referans kodun üzerinden ekstra Papel kazan.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l.038.48.016.2c.017.193.035.327.06.45a.75.75 0 01-.605.894l-.01.001a.75.75 0 01-.848-.532c-.067-.228-.107-.483-.131-.724L7.5 12.5H5a.75.75 0 01-.596-.295L3 10.5H2.75A1.75 1.75 0 011 8.75v-6zM2.75 2.5a.25.25 0 00-.25.25v6.25c0 .138.112.25.25.25h.5a.75.75 0 01.596.295l1.404 1.705H7.5a.75.75 0 01.75.75v.059l.013.191H13.25a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75z" />
      </svg>
    ),
    text: 'Mağazadan indirim kuponları kullanarak daha avantajlı alışveriş yapabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M7.22 1.63a1 1 0 011.56 0l1.22 1.46 1.86-.38a1 1 0 011.16.9l.17 1.9 1.6 1.04a1 1 0 010 1.7l-1.6 1.04-.17 1.9a1 1 0 01-1.16.9l-1.86-.38-1.22 1.46a1 1 0 01-1.56 0L6 10.21l-1.86.38a1 1 0 01-1.16-.9l-.17-1.9L1.21 6.75a1 1 0 010-1.7l1.6-1.04.17-1.9a1 1 0 011.16-.9L6 1.59l1.22-1.46z" />
      </svg>
    ),
    text: 'Aktif çekilişlere katılarak nadir ödüller ve Papel kazanabilirsin.',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0">
        <path d="M10.5 3.5a.5.5 0 00-1 0V4h-3v-.5a.5.5 0 00-1 0V4H4a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-1.5v-.5zM9.5 5v.5a.5.5 0 01-1 0V5h-3v.5a.5.5 0 01-1 0V5H4a1 1 0 00-1 1v1h10V6a1 1 0 00-1-1h-1.5zM3 9h10v3a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
      </svg>
    ),
    text: 'Liderlik tablosundan sunucunun en aktif üyelerini ve sıralamanı görebilirsin.',
  },
];

export default function SplashScreen({ onEnter }: Props) {
  const t = useT();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isDeveloperChecked, setIsDeveloperChecked] = useState(false);
  const [devAboutOpen, setDevAboutOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; avatarUrl: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(navigator.maxTouchPoints > 0);
  }, []);
  const linkSdkRef = useRef<InstanceType<Awaited<typeof import('@discord/embedded-app-sdk')>['DiscordSDK']> | null>(null);

  const openLink = async (url: string) => {
    try {
      const existing = getDiscordSdk();
      if (existing) { await existing.commands.openExternalLink({ url }); return; }
      if (!linkSdkRef.current) {
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await sdk.ready();
        linkSdkRef.current = sdk;
      }
      await linkSdkRef.current.commands.openExternalLink({ url });
    } catch { window.open(url, '_blank'); }
  };

  useEffect(() => {
    const t2 = setTimeout(() => setVisible(true), 80);

    fetchWithCreds(apiUrl('/api/auth/me'))
      .then(r => r.ok ? r.json() : null)
      .then((d: { username?: string; avatar?: string } | null) => {
        if (d?.username) setUser({ username: d.username, avatarUrl: d.avatar ?? '' });
      })
      .catch(() => {})
      .finally(() => setUserLoading(false));

    const checkMaintenance = (initial = false) => {
      fetch(apiUrl('/api/activity/maintenance'))
        .then(r => r.json())
        .then(d => { setMaintenance(d.maintenance === true); if (initial) setMaintenanceChecked(true); })
        .catch(() => { if (initial) setMaintenanceChecked(true); });
    };

    const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
    fetch(apiUrl('/api/activity/is-developer'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { if (d.isDeveloper) setIsDeveloper(true); setIsDeveloperChecked(true); })
      .catch(() => { setIsDeveloperChecked(true); });

    checkMaintenance(true);
    const interval = setInterval(() => checkMaintenance(false), 30000);

    return () => { clearTimeout(t2); clearInterval(interval); };
  }, []);

  // Tip rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % TIPS.length);
        setTipVisible(true);
      }, 350);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  const logoWhiteStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(105deg, #fff 0%, #fff 35%, rgba(255,255,255,0.95) 45%, #fff 55%, #fff 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };
  const logoBlueStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(105deg, #5865F2 0%, #5865F2 35%, #a5b4ff 45%, #5865F2 55%, #5865F2 100%)',
    backgroundSize: '300% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'titleShine 4s ease-in-out infinite',
  };

  const openDiscoWeb = async () => { await openLink('https://discoweb.tech'); };

  const stillLoading = !maintenanceChecked || (maintenance && !isDeveloperChecked);
  const blocked = maintenance && !isDeveloper;

  const handleScreenClick = (e: React.MouseEvent) => {
    if (stillLoading || blocked) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    onEnter();
  };

  return (
    <div
      className="splash-screen relative isolate flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0d12] cursor-default"
      onClick={handleScreenClick}
    >
      <style>{`
        @keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}
        @keyframes splashPulse{0%,100%{opacity:0.5}50%{opacity:0.85}}
      `}</style>
      <VideoBackground videoRef={videoRef} />
      {/* Extra left overlay — içeriği öne çıkar */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />

      {/* Mini player: only centered logo */}
      <div className="splash-mini-logo pointer-events-none absolute inset-0 z-20 hidden items-center justify-center">
        <div className="pointer-events-auto flex flex-col items-center gap-1">
          <span className="cursor-pointer font-black tracking-tight select-none text-3xl" onClick={openDiscoWeb} style={logoWhiteStyle}>
            Disco<span style={logoBlueStyle}>Web</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">{t('splash_platform_name')}</span>
        </div>
      </div>

      <div
        className="splash-full-ui flex flex-col min-h-screen"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        {/* Top bar — logo solda, ses butonu sağda */}
        <div className="relative z-20 flex items-start justify-between px-8 sm:px-14 pt-7 flex-shrink-0">
          <div className="flex flex-col gap-0.5" style={{ filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.9))' }}>
            <span
              className="cursor-pointer font-black tracking-tight select-none leading-none text-3xl"
              onClick={openDiscoWeb}
              style={logoWhiteStyle}
            >
              Disco<span style={logoBlueStyle}>Web</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
              {t('splash_platform_name')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu openLink={openLink} />
            <MuteButton muted={muted} onToggle={toggleMute} />
          </div>
        </div>

        {/* Main content — left aligned, vertically centered */}
        <main className="relative z-10 flex flex-1 w-full flex-col items-start justify-center px-8 sm:px-14">
          <div
            className="flex flex-col gap-5 max-w-sm w-full"
            style={{ transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'transform 0.8s ease' }}
          >

            {/* İçerik — kutu yok, direkt video üzerinde */}
            <div className="flex flex-col gap-4">
              {/* Welcome */}
              <div
                className="flex items-center gap-2.5"
                style={{ transition: 'opacity 0.4s ease', opacity: visible ? 1 : 0 }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="h-7 w-7 rounded-full ring-1 ring-white/10 flex-shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-white/10 flex-shrink-0" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-semibold text-white/90" style={{ textShadow: '0 1px 12px rgba(0,0,0,1)' }}>
                    {userLoading
                      ? <span className="inline-block h-3.5 w-28 rounded bg-white/10 animate-pulse" />
                      : user
                        ? t('splash_welcome_user', { username: user.username })
                        : t('splash_welcome_generic')}
                  </span>
                  <span className="text-xs text-white/50" style={{ textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
                    {blocked ? t('splash_welcome_subtitle_maintenance') : t('splash_welcome_subtitle')}
                  </span>
                </div>
              </div>

              {/* Tip — welcome altında, ikincil */}
              <div className="h-[56px] flex items-start">
                <div
                  className="flex items-start gap-3"
                  style={{
                    opacity: tipVisible ? 0.5 : 0,
                    transform: tipVisible ? 'translateY(0)' : 'translateY(4px)',
                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                  }}
                >
                  <span className="text-white/40 mt-0.5 flex-shrink-0">{TIPS[tipIndex].icon}</span>
                  <p className="text-xs text-white/40 leading-relaxed" style={{ textShadow: '0 1px 10px rgba(0,0,0,1)' }}>
                    {TIPS[tipIndex].text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Tap / click hint — footer üstü, ortalı */}
        <div className="relative z-10 flex justify-center pb-4 flex-shrink-0">
          {stillLoading ? (
            <svg className="h-3.5 w-3.5 animate-spin text-white/25" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : blocked ? (
            <span className="text-xs text-white/25">{t('splash_maintenance_title')}</span>
          ) : (
            <span
              className="text-xs text-white/40 tracking-wide"
              style={{ textShadow: '0 1px 10px rgba(0,0,0,1)', animation: 'splashPulse 2.5s ease-in-out infinite' }}
            >
              {isTouch ? t('splash_tap_to_start') : t('splash_click_to_start')}
            </span>
          )}
        </div>

        {/* Bottom footer — copyright sol, linkler sağ */}
        <div className="relative z-10 flex items-center justify-between px-8 sm:px-14 pb-8 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">© {new Date().getFullYear()} DiscoWeb</span>
            <span className="text-white/20 text-xs">·</span>
            <button type="button" onClick={() => setDevAboutOpen(true)} className="text-xs text-white/40 hover:text-white/70 transition-colors">Thank You</button>
            {isDeveloper && (
              <>
                <span className="text-white/20 text-xs">·</span>
                <button
                  type="button"
                  onClick={() => router.push('/activity/developer')}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Developer
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openLink('https://discoweb.tech/terms')} className="text-xs text-white/40 hover:text-white/70 transition-colors">{t('splash_terms')}</button>
            <span className="text-white/20 text-xs">·</span>
            <button type="button" onClick={() => openLink('https://discoweb.tech/privacy')} className="text-xs text-white/40 hover:text-white/70 transition-colors">{t('splash_privacy')}</button>
          </div>
        </div>
      </div>

      {devAboutOpen && <DeveloperAboutModal onClose={() => setDevAboutOpen(false)} />}
    </div>
  );
}
