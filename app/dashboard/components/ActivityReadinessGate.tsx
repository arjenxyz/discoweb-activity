'use client';

import { useMemo, useRef, useState } from 'react';
import WelcomeScreen from './WelcomeScreen';
import VerifyRoleScreen from './VerifyRoleScreen';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { VideoBackground, MuteButton } from './VideoBackground';

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
  | 'missing_verify_role'
  | 'discord_api_error';

export type ActivityReadiness = {
  status: ActivityReadinessStatus;
  blocking: boolean;
  guildId: string | null;
  guildName: string | null;
  isAdmin: boolean;
  canInviteBot: boolean;
  inviteUrl: string | null;
  botInGuild?: boolean;
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
};

const COPY_BY_STATUS: Record<ActivityReadinessStatus, GateCopy> = {
  ready: {
    title: 'Her şey hazır',
    description: 'Sistem başarıyla başlatıldı ve kullanıma hazır.',
    helper: 'Bir sorun yaşıyorsanız sayfayı yeniden deneyebilirsiniz.',
  },
  unauthorized: {
    title: 'Oturum Doğrulanamadı',
    description: 'Discord Activity oturumunuz şu anda doğrulanamıyor. Bu durum genellikle oturum sürenizin dolması veya Discord bağlantı sorunlarından kaynaklanmaktadır.',
    helper: 'Activity penceresini kapatıp bir süre bekledikten sonra tekrar açınız.',
  },
  missing_guild: {
    title: 'Sunucu Bilgisi Alınamadı',
    description: 'Bu Activity oturumunda sunucu bilgisi iletilemedi. Activity, yalnızca bir sunucunun ses kanalından başlatıldığında düzgün çalışabilmektedir.',
    helper: 'Lütfen Activity\'yi sunucu içindeki bir ses kanalından yeniden başlatınız.',
  },
  missing_service_role: {
    title: 'Sistem Yapılandırması Eksik',
    description: 'Sunucu tarafındaki servis yapılandırması eksik veya hatalı. Bu teknik bir sorun olup uygulamanın düzgün çalışabilmesi için giderilmesi gerekmektedir.',
    helper: 'Lütfen bu durumu proje geliştiricisine bildirin.',
  },
  server_not_registered: {
    title: 'Sunucu Kaydı Bulunamadı',
    description: 'Botumuzun sunucunuzda aktif olduğunu biliyoruz, ancak sunucunuza ait bir kayıt sistemimizde bulunamıyor. Bu durum genellikle kurulum sürecinin tamamlanmamış olmasından, yetki eksikliklerinden veya sunucu veritabanı kaydının oluşturulamamasından kaynaklanmaktadır. Kurulumu tamamlamak için discoweb.tech adresini ziyaret ederek sunucunuzu birkaç adımda sisteme ekleyebilirsiniz.',
    helper: 'Sunucu yöneticisi veya sahibi discoweb.tech üzerinden kurulumu tamamlayabilir.',
  },
  server_setup_required: {
    title: 'Kurulum Tamamlanmamış',
    description: 'Sunucu sahibi olduğunuzu tespit ettik. DiscoWeb uygulamasına devam edebilmek için discoweb.tech sitemizi ziyaret ederek kurulumu kolayca tamamlayabilirsiniz. İşlem yalnızca birkaç dakika sürmektedir.',
    helper: 'discoweb.tech üzerinden kurulumu tamamladıktan sonra buraya geri dönebilirsiniz.',
  },
  missing_bot_token: {
    title: 'Bot Yapılandırması Eksik',
    description: 'Sunucu tarafında bot kimlik doğrulama bilgisi bulunamadı. Rol atamaları ve kazanç işlemleri bu bilgi olmadan gerçekleştirilememektedir.',
    helper: 'Bu teknik durumu proje geliştiricisine veya sistem yöneticisine bildirin.',
  },
  missing_user_profile: {
    title: 'Üyelik Kaydı Bulunamadı',
    description: 'Bu sunucuda size ait bir üyelik kaydı henüz oluşturulmamış. DiscoWeb\'e erişim sağlamak için profil oluşturmanız gerekmektedir.',
    helper: 'Aşağıdaki butona tıklayarak hızlıca kayıt oluşturabilirsiniz.',
  },
  missing_verify_role: {
    title: 'Hesap Doğrulaması Gerekli',
    description: 'Bu sunucudaki içeriklere erişim sağlayabilmek için doğrulanmış üye rolüne sahip olmanız gerekmektedir. Rol ataması otomatik olarak gerçekleştirilmektedir.',
    helper: 'Aşağıdaki butona tıklayın; rol hesabınıza anında atanacaktır.',
  },
  bot_not_in_guild: {
    title: 'Bot Sunucuda Bulunamıyor',
    description: 'Kazanç takibi, rol yönetimi ve diğer DiscoWeb özelliklerinin çalışabilmesi için botun sunucunuzda aktif olması zorunludur. Bot şu anda bu sunucuda görünmüyor.',
    helper: 'Sunucu yöneticilerinden birinin botu sunucuya davet etmesi gerekmektedir.',
  },
  user_not_in_guild: {
    title: 'Sunucu Üyeliği Bulunamadı',
    description: 'Kullandığınız Discord hesabı, seçili sunucuda aktif üye olarak görünmüyor. Bu durum sunucudan ayrılmış olmanızdan ya da hesap değişikliğinden kaynaklanıyor olabilir.',
    helper: 'Sunucuya tekrar katılın ve ardından Activity\'yi yeniden başlatın.',
  },
  discord_api_error: {
    title: 'Discord Servis Hatası',
    description: 'Discord sunucularından geçici olarak yanıt alınamıyor. Bu durum Discord altyapısındaki anlık kesintilerden kaynaklanmakta olup kısa süre içinde kendiliğinden çözülmektedir.',
    helper: 'Birkaç dakika bekledikten sonra tekrar deneyebilirsiniz.',
  },
};

export default function ActivityReadinessGate({ readiness, loading, onRetry }: GateProps) {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reportedStatus, setReportedStatus] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) { v.muted = false; v.volume = 1; v.play().catch(() => {}); }
    else { v.muted = true; }
    setMuted(v.muted);
  };

  const REPORTABLE = new Set(['discord_api_error', 'missing_service_role', 'missing_bot_token', 'server_not_registered', 'server_setup_required']);
  const alreadyReported = reportedStatus === readiness.status;

  const handleReport = async () => {
    try {
      await fetchWithCreds('/api/admin/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: readiness.status,
          guildId: readiness.guildId,
          guildName: readiness.guildName,
          debug: readiness.debug,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      });
      setReportedStatus(readiness.status);
    } catch { /* sessizce geç */ }
  };
  if (readiness.status === 'missing_user_profile') {
    return <WelcomeScreen readiness={readiness} onRetry={onRetry} />;
  }

  if (readiness.status === 'missing_verify_role') {
    return <VerifyRoleScreen readiness={readiness} onRetry={onRetry} />;
  }

  const openSetupSite = async () => {
    const url = 'https://discoweb.tech';
    try {
      const { DiscordSDK } = await import('@discord/embedded-app-sdk');
      const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
      await sdk.ready();
      await sdk.commands.openExternalLink({ url });
    } catch {
      window.open(url, '_blank');
    }
  };

  const copy = useMemo(() => COPY_BY_STATUS[readiness.status], [readiness.status]);
  const isBotMissing = readiness.status === 'bot_not_in_guild';
  const isAdmin = readiness.isAdmin && readiness.canInviteBot;

  const supportMessage = useMemo(() => {
    const serverName = readiness.guildName ?? readiness.guildId ?? 'bu sunucu';
    const botLink = readiness.inviteUrl ? `\nBot davet linki: ${readiness.inviteUrl}` : '';
    if (isBotMissing && isAdmin) {
      return `Merhaba, "${serverName}" sunucusu için Activity açılırken bot sunucuda bulunamıyor. Botu eklemem gerekiyor.${botLink}`;
    }
    if (isBotMissing) {
      return `Merhaba, "${serverName}" sunucusu için Activity açılırken bot sunucuda bulunamıyor hatası alıyorum. Botu sunucuya ekleyebilir misiniz?${botLink}`;
    }
    return `Merhaba, "${serverName}" sunucusu için Activity açılırken "${readiness.status}" hatası alıyorum. Kontrol edebilir misiniz?`;
  }, [isAdmin, isBotMissing, readiness.guildId, readiness.guildName, readiness.inviteUrl, readiness.status]);

  const copyToClipboard = async (text: string) => {
    try {
      // Discord Activity'de clipboard API çalışmaz, execCommand fallback
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setCopied(false);
      }
    }
  };

  const openBotInvite = async (url: string) => {
    try {
      const { DiscordSDK } = await import('@discord/embedded-app-sdk');
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!;
      const sdk = new DiscordSDK(clientId);
      await sdk.ready();
      await sdk.commands.openExternalLink({ url });
    } catch {
      // fallback: window.open
      window.open(url, '_blank');
    }
  };


  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#0b0d12] text-white">
      <VideoBackground videoRef={videoRef} />
      <main className="relative z-10 flex min-h-screen w-full flex-col items-start justify-end gap-6 px-5 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-10">
        {/* Sol alt — durum metni */}
        <div className="flex flex-col gap-3 max-w-sm w-full sm:w-auto">
          {readiness.guildName && (
            <p className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/70 backdrop-blur-md">
              {readiness.guildName}
            </p>
          )}
          <h1
            className="text-4xl font-black leading-tight tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.2), 0 2px 12px rgba(0,0,0,1)' }}
          >
            {copy.title}
          </h1>
          <p className="text-sm text-white/60 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {copy.description}
          </p>
          <p className="text-xs text-white/45 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            {copy.helper}
          </p>
          {REPORTABLE.has(readiness.status) && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 backdrop-blur-md flex flex-col gap-2">
              <p className="text-xs font-mono text-red-300">
                hata: <span className="font-bold">{readiness.status}</span>
                {readiness.debug && (
                  <> · {JSON.stringify(readiness.debug)}</>
                )}
              </p>
              <button
                type="button"
                onClick={handleReport}
                disabled={alreadyReported}
                className="self-start flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/25 px-4 py-1.5 text-xs font-semibold text-red-200 backdrop-blur-md transition hover:bg-red-500/40 disabled:opacity-50"
              >
                {alreadyReported ? (
                  '✓ Bildirildi'
                ) : (
                  <>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path d="M3.5 2a.5.5 0 01.5-.5h8a.5.5 0 01.354.854L9.207 5.5l3.147 3.146A.5.5 0 0112 9.5H4.5V14a.5.5 0 01-1 0V2z" />
                    </svg>
                    Bildir
                  </>
                )}
              </button>
            </div>
          )}
          {copied && <p className="text-xs font-semibold text-emerald-400">Kopyalandı.</p>}
        </div>

        {/* Sağ alt — butonlar */}
        <div className="flex w-full shrink-0 flex-col items-start gap-2 sm:w-auto sm:items-end">
          <MuteButton muted={muted} onToggle={toggleMute} />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-50"
            >
              {loading ? 'Kontrol ediliyor...' : 'Tekrar dene'}
            </button>

            {isBotMissing && isAdmin && readiness.inviteUrl && (
              <button
                type="button"
                onClick={() => openBotInvite(readiness.inviteUrl as string)}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 backdrop-blur-md transition hover:bg-emerald-500/30"
              >
                Botu Sunucuya Ekle
              </button>
            )}

            {isBotMissing && (
              <button
                type="button"
                onClick={() => copyToClipboard(supportMessage)}
                className="rounded-full border border-yellow-400/30 bg-yellow-500/20 px-5 py-2.5 text-sm font-semibold text-yellow-100 backdrop-blur-md transition hover:bg-yellow-500/30"
              >
                {isAdmin ? 'Yetkili notunu kopyala' : 'Yetkiliye mesaj kopyala'}
              </button>
            )}

            {/* Admin: siteye yönlendir */}
            {(readiness.status === 'server_not_registered' || readiness.status === 'server_setup_required') && readiness.isAdmin && (
              <button
                type="button"
                onClick={openSetupSite}
                className="rounded-full border border-[#5865F2]/50 bg-[#5865F2]/30 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-[#5865F2]/50"
              >
                discoweb.tech'te Kur
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

