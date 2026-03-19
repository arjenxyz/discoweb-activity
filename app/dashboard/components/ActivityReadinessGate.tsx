'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import WelcomeScreen from './WelcomeScreen';

export type ActivityReadinessStatus =
  | 'ready'
  | 'unauthorized'
  | 'missing_guild'
  | 'missing_service_role'
  | 'server_not_registered'
  | 'server_setup_required'
  | 'missing_bot_token'
  | 'bot_not_in_guild'
  | 'user_not_in_guild'
  | 'missing_user_profile'
  | 'discord_api_error';

export type ActivityReadiness = {
  status: ActivityReadinessStatus;
  blocking: boolean;
  guildId: string | null;
  guildName: string | null;
  isAdmin: boolean;
  canInviteBot: boolean;
  inviteUrl: string | null;
  debug?: Record<string, unknown>;
};

type GateProps = {
  readiness: ActivityReadiness;
  loading: boolean;
  onRetry: () => void;
};

type GateCopy = {
  title: string;
  description: string;
  helper: string;
  gif: string;
};

const COPY_BY_STATUS: Record<ActivityReadinessStatus, GateCopy> = {
  ready: {
    title: 'Her sey hazir',
    description: 'Sistem kullanima hazir.',
    helper: 'Sorun goruyorsan yeniden deneyebilirsin.',
    gif: '/gif/cat.gif',
  },
  unauthorized: {
    title: 'Oturum dogrulanamadi',
    description: 'Discord Activity oturumun su an dogrulanamiyor.',
    helper: 'Activity ekranini kapatip tekrar ac.',
    gif: '/gif/indir2.gif',
  },
  missing_guild: {
    title: 'Sunucu bilgisi eksik',
    description: 'Bu Activity acilisinda sunucu bilgisi gelmedi.',
    helper: 'Activityyi sunucu icindeki ses kanalindan tekrar baslat.',
    gif: '/gif/world.gif',
  },
  missing_service_role: {
    title: 'Sistem konfig eksik',
    description: 'Sunucu tarafi servis anahtari eksik veya hatali.',
    helper: 'Lutfen proje gelistiricisine haber ver.',
    gif: '/penguin/water.gif',
  },
  server_not_registered: {
    title: 'Sunucu sisteme kayitli degil',
    description: 'Bu sunucu icin aktivite ayarlari henuz olusturulmamis.',
    helper: 'Yonetici setup islemini tamamladiktan sonra tekrar dene.',
    gif: '/penguin/hopidi.gif',
  },
  server_setup_required: {
    title: 'Sunucu kurulumu tamamlanmamis',
    description: 'Ekonomi ve rol sistemi icin zorunlu ayarlar eksik.',
    helper: 'Sunucu yoneticisinin setup komutunu tamamlamasi gerekiyor.',
    gif: '/penguin/yuppi.gif',
  },
  missing_bot_token: {
    title: 'Bot tokeni eksik',
    description: 'Sunucu tarafinda bot tokeni bulunamadi.',
    helper: 'Yonetici veya gelistirici ortami kontrol etmeli.',
    gif: '/penguin/water.gif',
  },
  missing_user_profile: {
    title: 'Profil kaydi bulunamadi',
    description: 'Bu sunucuda henüz bir profiliniz kayitli degil.',
    helper: 'Kaydinizi olusturmak icin asagidaki butona Tiklayin.',
    gif: '/gif/from.gif',
  },
  bot_not_in_guild: {
    title: 'Bot bu sunucuda degil',
    description: 'Kazanc ve rol islemleri icin botun sunucuda olmasi zorunlu.',
    helper: 'Yetkili bir yonetici botu sunucuya eklemeli.',
    gif: '/penguin/cryformoney.gif',
  },
  user_not_in_guild: {
    title: 'Sunucu uyeligi bulunamadi',
    description: 'Bu hesap secili sunucuda uye degil ya da ayrilmis gorunuyor.',
    helper: 'Sunucuya tekrar katilip Activityyi yeniden baslat.',
    gif: '/gif/sungorbobcry.gif',
  },
  discord_api_error: {
    title: 'Discord API gecici hatasi',
    description: 'Discord servisinden gecici bir cevap alinamadi.',
    helper: 'Biraz bekleyip tekrar denemen yeterli.',
    gif: '/gif/herewego.gif',
  },
};

export default function ActivityReadinessGate({ readiness, loading, onRetry }: GateProps) {
  if (readiness.status === 'missing_user_profile') {
    return <WelcomeScreen readiness={readiness} onRetry={onRetry} />;
  }

  const [copied, setCopied] = useState(false);

  const copy = useMemo(() => COPY_BY_STATUS[readiness.status], [readiness.status]);
  const isBotMissing = readiness.status === 'bot_not_in_guild';
  const isAdmin = readiness.isAdmin && readiness.canInviteBot;

  const supportMessage = useMemo(() => {
    const serverName = readiness.guildName ?? readiness.guildId ?? 'bu sunucu';
    if (isBotMissing && isAdmin && readiness.inviteUrl) {
      return `Merhaba, ${serverName} icin bot eksik gorunuyor. Davet linki: ${readiness.inviteUrl}`;
    }
    if (isBotMissing) {
      return `Merhaba, ${serverName} icin Activity acilirken botun sunucuda olmadigi hatasi aliyorum. Lutfen botu sunucuya ekleyebilir misiniz?`;
    }
    return `Merhaba, ${serverName} icin Activity acilirken ${readiness.status} hatasi aliyorum. Kontrol edebilir misiniz?`;
  }, [isAdmin, isBotMissing, readiness.guildId, readiness.guildName, readiness.inviteUrl, readiness.status]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#5865F255_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#3a9cff33_0%,transparent_40%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <section className="grid w-full gap-6 rounded-3xl border border-white/10 bg-[#0f1118]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-[#5865F2]/40 bg-[#5865F2]/15 px-3 py-1 text-xs font-semibold text-[#c7ceff]">
              Discord Activity Durumu
            </p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{copy.title}</h1>
            <p className="text-sm text-white/80 sm:text-base">{copy.description}</p>
            <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">{copy.helper}</p>

            {readiness.status === 'discord_api_error' && readiness.debug && (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-mono text-red-300">
                debug: {JSON.stringify(readiness.debug)}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Kontrol ediliyor...' : 'Tekrar kontrol et'}
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('selectedGuildId');
                  localStorage.removeItem('discord_bearer_token');
                  localStorage.removeItem('discord_frame_id');
                  localStorage.removeItem('discordUser');
                  document.cookie = 'discord_session=; Max-Age=0; path=/;';
                  document.cookie = 'selected_guild_id=; Max-Age=0; path=/;';
                  window.location.reload();
                }}
                className="rounded-full border border-orange-300 bg-orange-500/20 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/40"
              >
                Çerezleri Temizle
              </button>

              {isBotMissing && isAdmin && readiness.inviteUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(readiness.inviteUrl as string)}
                    className="rounded-full border border-[#3dc481]/40 bg-[#3dc481]/20 px-4 py-2 text-sm font-semibold text-[#c8ffe2] transition hover:bg-[#3dc481]/30"
                  >
                    Bot davet linkini kopyala
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(supportMessage)}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-white/20"
                  >
                    Yetkili notunu kopyala
                  </button>
                </>
              )}

              {isBotMissing && !isAdmin && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(supportMessage)}
                  className="rounded-full border border-[#f5b942]/40 bg-[#f5b942]/20 px-4 py-2 text-sm font-semibold text-[#ffe4aa] transition hover:bg-[#f5b942]/30"
                >
                  Yetkiliye mesaji kopyala
                </button>
              )}
            </div>

            {copied && <p className="text-xs font-semibold text-emerald-300">Kopyalandi.</p>}

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/60">
              Sunucu: <span className="font-semibold text-white/85">{readiness.guildName ?? readiness.guildId ?? 'Bilinmiyor'}</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4">
            <div className="absolute inset-x-5 bottom-4 h-28 rounded-full bg-[#5865F2]/20 blur-3xl" />
            <Image
              src={copy.gif}
              alt="activity-state"
              width={420}
              height={320}
              loading="eager"
              unoptimized
              className="relative z-10 h-auto max-h-[290px] w-auto rounded-2xl object-contain"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

