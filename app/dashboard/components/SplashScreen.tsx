'use client';

import React, { useRef, useState, useEffect } from 'react';
import { MuteButton, VideoBackground } from './VideoBackground';
import DeveloperPanel from './DeveloperPanel';
import { apiUrl } from '@/lib/api';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { getDiscordSdk } from '@/lib/discordSdk';

type Props = {
  onEnter: () => void;
};

export default function SplashScreen({ onEnter }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [visible, setVisible] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isDeveloperChecked, setIsDeveloperChecked] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; avatarUrl: string } | null>(null);
  const linkSdkRef = useRef<InstanceType<Awaited<typeof import('@discord/embedded-app-sdk')>['DiscordSDK']> | null>(null);

  // Chat state
  const [chatStep, setChatStep] = useState(0);
  const [userReplied1, setUserReplied1] = useState(false);
  const [userReplied2, setUserReplied2] = useState(false);

  const openLink = async (url: string) => {
    try {
      const existing = getDiscordSdk();
      if (existing) {
        await existing.commands.openExternalLink({ url });
        return;
      }
      if (!linkSdkRef.current) {
        const { DiscordSDK } = await import('@discord/embedded-app-sdk');
        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await sdk.ready();
        linkSdkRef.current = sdk;
      }
      await linkSdkRef.current.commands.openExternalLink({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);

    fetchWithCreds(apiUrl('/api/auth/me'))
      .then(r => r.ok ? r.json() : null)
      .then((d: { username?: string; avatar?: string } | null) => {
        if (d?.username) {
          setUser({ username: d.username, avatarUrl: d.avatar ?? '' });
        }
      })
      .catch(() => {});

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

    return () => { clearTimeout(t); clearInterval(interval); };
  }, []);

  // Chat step progression
  useEffect(() => {
    if (!visible) return;
    // Step 1: Arjen'in ilk mesajı
    const t1 = setTimeout(() => setChatStep(1), 500);
    return () => clearTimeout(t1);
  }, [visible]);

  useEffect(() => {
    if (chatStep === 1) {
      // Step 2: Kullanıcı balonu
      const t = setTimeout(() => setChatStep(2), 800);
      return () => clearTimeout(t);
    }
    if (chatStep === 3) {
      // Step 4: İkinci kullanıcı balonu
      const t = setTimeout(() => setChatStep(4), 800);
      return () => clearTimeout(t);
    }
  }, [chatStep]);

  const handleUserReply1 = () => {
    if (userReplied1) return;
    setUserReplied1(true);
    setTimeout(() => setChatStep(3), 600);
  };

  const handleUserReply2 = () => {
    if (userReplied2) return;
    setUserReplied2(true);
    setTimeout(() => setChatStep(5), 600);
  };

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

  const openDiscoWeb = async () => {
    await openLink('https://discoweb.tech');
  };

  const LogoBlock = ({ size = 'md', centered = false }: { size?: 'sm' | 'md'; centered?: boolean }) => (
    <div className={`flex flex-col gap-1 ${centered ? 'items-center text-center' : ''}`}>
      <style>{`@keyframes titleShine{0%,60%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <span
        className={`cursor-pointer font-black tracking-tight select-none ${size === 'sm' ? 'text-3xl' : 'text-2xl'}`}
        onClick={openDiscoWeb}
        style={logoWhiteStyle}
      >
        Disco<span style={logoBlueStyle}>Web</span>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
        Discord Economy Platform
      </span>
    </div>
  );

  const DevButton = () => (
    <button
      type="button"
      onClick={() => setDevPanelOpen(true)}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
      aria-label="Developer Panel"
    >
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 110-5.858 2.929 2.929 0 010 5.858z" />
      </svg>
    </button>
  );

  const EnterButton = () => {
    const stillLoading = !maintenanceChecked || (maintenance && !isDeveloperChecked);
    if (stillLoading) {
      return (
        <button type="button" disabled className="group relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 cursor-not-allowed bg-white/10 backdrop-blur-md border border-white/10">
          <span className="relative flex items-center gap-2">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Yükleniyor
          </span>
        </button>
      );
    }
    const blocked = maintenance && !isDeveloper;
    return (
      <button
        type="button"
        onClick={blocked ? undefined : onEnter}
        disabled={blocked}
        className={`group relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 active:scale-95 backdrop-blur-md ${blocked ? 'cursor-not-allowed bg-white/10' : maintenance ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30' : 'bg-white/10 hover:bg-white/15 border border-white/20'}`}
        style={{}}
      >
        {!blocked && <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />}
        <span className="relative flex items-center gap-2">
          {blocked ? 'Activity Bakımda' : 'Hadi Başlayalım'}
          {!blocked && (
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5">
              <path d="M3.75 7.25a.75.75 0 000 1.5h6.19l-2.72 2.72a.75.75 0 001.06 1.06l4-4a.75.75 0 000-1.06l-4-4a.75.75 0 00-1.06 1.06l2.72 2.72H3.75z" />
            </svg>
          )}
        </span>
      </button>
    );
  };

  const FooterLine = ({ centered = false }: { centered?: boolean }) => (
    <div className={`flex flex-col gap-1 ${centered ? 'items-center' : 'items-start'}`}>
      <div className="flex items-center gap-1.5">
        <img src="https://cdn.discordapp.com/avatars/1163500308270436442/8c2eeba5e9c137e4f9375bccb0f0bf40.png?size=128" alt="thearjen" className="h-5 w-5 rounded-full opacity-70" />
        <span className="text-xs text-white/60">Created by <span className="text-white/90 font-semibold">thearjen</span> · All rights reserved</span>
      </div>
      <div className="flex items-center gap-2 pl-[26px]">
        <button type="button" onClick={() => openLink('https://discoweb.tech/terms')} className="text-xs text-white/50 hover:text-white/75 transition-colors">Kullanım Şartları</button>
        <span className="text-white/30 text-xs">·</span>
        <button type="button" onClick={() => openLink('https://discoweb.tech/privacy')} className="text-xs text-white/50 hover:text-white/75 transition-colors">Gizlilik Politikası</button>
      </div>
    </div>
  );

  // Chat bubble fade-in style helper
  const fadeIn = (show: boolean): React.CSSProperties => ({
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    pointerEvents: show ? 'auto' : 'none',
  });

  const ChatConversation = () => (
    <div className="flex flex-col gap-2 w-[280px]">
      {/* Adım 1: Arjen mesajı */}
      <div style={fadeIn(chatStep >= 1)} className="flex flex-col gap-0.5">
        <span className="text-[10px] text-white/40 pl-1">Arjen</span>
        <div className="self-start bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-white">
          Hey orada kim var? 👀
        </div>
      </div>

      {/* Adım 2: Kullanıcı cevap balonu */}
      <div style={fadeIn(chatStep >= 2)} className="self-end">
        <button
          type="button"
          onClick={handleUserReply1}
          disabled={userReplied1}
          className={`rounded-2xl rounded-tr-sm px-4 py-2 text-sm font-medium text-white transition-all duration-200 border ${
            userReplied1
              ? 'bg-white/15 border-white/20 cursor-default'
              : 'bg-transparent border-white/30 hover:bg-white/10 hover:border-white/50'
          }`}
        >
          {user?.username ?? 'Benim!'}
        </button>
      </div>

      {/* Adım 3: Arjen ikinci mesajı */}
      <div style={fadeIn(chatStep >= 3)} className="flex flex-col gap-0.5">
        <span className="text-[10px] text-white/40 pl-1">Arjen</span>
        <div className="self-start bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-white">
          Merhaba, {user?.username ?? 'seni'}! 👋 Ben Arjen. Bu platformu baştan sona tek başıma inşa ettim.
        </div>
      </div>

      {/* Adım 4: İkinci kullanıcı cevap balonu */}
      <div style={fadeIn(chatStep >= 4)} className="self-end">
        <button
          type="button"
          onClick={handleUserReply2}
          disabled={userReplied2}
          className={`rounded-2xl rounded-tr-sm px-4 py-2 text-sm font-medium text-white transition-all duration-200 border ${
            userReplied2
              ? 'bg-white/15 border-white/20 cursor-default'
              : 'bg-transparent border-white/30 hover:bg-white/10 hover:border-white/50'
          }`}
        >
          Buraya geldiğime sevindim
        </button>
      </div>

      {/* Adım 5: Arjen son mesajı + buton */}
      <div style={fadeIn(chatStep >= 5)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40 pl-1">Arjen</span>
          <div className="self-start bg-white/10 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-2 text-sm text-white">
            Harika! İçeride seni bekleyen birçok şey var. Hazır mısın? 🚀
          </div>
        </div>
        <div className="flex items-center gap-3 self-end">
          {isDeveloper && <DevButton />}
          <EnterButton />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0d12]">
      <VideoBackground videoRef={videoRef} />

      {/* ── DESKTOP: üst bar — logo sol, mute sağ ── */}
      <div
        className="relative z-10 hidden lg:flex items-start justify-between px-10 pt-8"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        <LogoBlock size="md" />
        <MuteButton muted={muted} onToggle={toggleMute} />
      </div>

      {/* ── MOBİL: merkez logo ── */}
      <div
        className="lg:hidden relative z-10 flex flex-col items-center justify-start flex-1 gap-1 pointer-events-none pt-6"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        <div className="pointer-events-auto">
          <LogoBlock size="sm" centered />
        </div>
      </div>

      {/* ── FOOTER — absolute alta sabitli, bağımsız katman ── */}
      <div
        className="hidden lg:block absolute z-10 bottom-10 left-10"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.7s ease' }}
      >
        <FooterLine />
      </div>

      {/* ── SAĞ ALTA — sohbet + buton ── */}
      <div
        className="hidden lg:flex absolute z-10 bottom-10 right-14 items-end"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}
      >
        <ChatConversation />
      </div>

      {/* ── ALT ALAN — mobil ── */}
      <div
        className="relative z-10 mt-auto w-full flex flex-col gap-3 px-6 pb-8 sm:px-10 sm:pb-10"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}
      >
        {/* Masaüstü placeholder — boş, gerçek içerik absolute'ta */}
        <div className="hidden lg:block" />

        {/* Mobil: dikey, ortada */}
        <div className="lg:hidden flex flex-col items-center gap-3">
          <ChatConversation />
          <div className="flex items-center gap-3">
            <MuteButton muted={muted} onToggle={toggleMute} />
            {isDeveloper && <DevButton />}
          </div>
          <FooterLine centered />
        </div>
      </div>

      {devPanelOpen && (
        <DeveloperPanel maintenance={maintenance} onMaintenanceChange={setMaintenance} onClose={() => setDevPanelOpen(false)} />
      )}
    </div>
  );
}
