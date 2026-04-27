'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getDiscordSdk } from '@/lib/discordSdk';

export default function SpoilerWarningModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const linkSdkRef = useRef<InstanceType<Awaited<typeof import('@discord/embedded-app-sdk')>['DiscordSDK']> | null>(null);

  useEffect(() => {
    // Component mount olduğunda localStorage kontrolü yap
    const hasSeenWarning = localStorage.getItem('hasSeenSpoilerWarning');
    if (!hasSeenWarning) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    // Modal göründüğünde geri sayımı başlat
    if (isVisible && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => {
          const newCountdown = prev - 1;
          if (newCountdown === 0) {
            setIsButtonDisabled(false);
          }
          return newCountdown;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, countdown]);

  // Prime Video URL'sini belirle - tüm diller için aynı global link
  const getPrimeVideoUrl = () => {
    return 'https://www.primevideo.com/detail/0K677J96WQ96K6UY6BL15O70CO';
  };

  const openExternalLink = async (url: string) => {
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

  const handleWatchInvincible = () => {
    openExternalLink(getPrimeVideoUrl());
  };

  const handleAccept = () => {
    localStorage.setItem('hasSeenSpoilerWarning', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Modal Container - Biraz daha geniş ve yüksekliği artırıldı */}
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1420] shadow-2xl overflow-hidden min-h-[450px] flex flex-col justify-end">
        
        {/* Arka Plan Videosu */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video/invincible.mp4" type="video/mp4" />
          {/* Video yüklenmezse diye fallback */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-red-900" />
        </video>

        {/* Sol Üst Logo */}
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
          className="absolute top-6 left-6 z-20 h-10 w-auto drop-shadow-xl"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* Metinlerin okunabilmesi için aşağıdan yukarıya koyulaşan degrade (gradient) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* İçerik Alanı */}
        <div className="relative z-10 flex flex-col p-8 pt-32 h-full justify-end">
          
          {/* Başlık */}
          <h2 className="mb-4 text-3xl font-black tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] uppercase">
            Spoiler Uyarısı
          </h2>

          {/* Geliştirilmiş Metinler */}
          <div className="mb-8 space-y-4 text-base text-white/95 drop-shadow-md">
            <p>
              Bu uygulama, tutkulu <strong className="text-amber-400 font-bold">Invincible</strong> hayranları tarafından hazırlanmış bir fan projesidir.
            </p>
            <p>
              Arşivimizde dizinin kritik anlarına dair <strong className="text-red-500 font-bold">spoiler&apos;lar</strong> yer almaktadır.
            </p>
            <p className="text-gray-300 italic">
              Eğer serüveni henüz tamamlamadıysan, yolculuğuna gölge düşmemesi için dikkatli ol!
            </p>
          </div>

          {/* Alt Kısım: Not ve Butonlar */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 mt-auto">
            <p className="text-sm text-gray-400 font-medium">
              Bu uyarı bir daha gösterilmeyecek.
            </p>
            
            {/* Butonlar */}
            <div className="flex gap-3">
              {/* Watch Button with Prime Video Logo */}
              <button
                onClick={handleWatchInvincible}
                className="w-fit rounded-lg bg-white/10 backdrop-blur-md border border-white/20 py-2 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0f1420] shadow-lg flex items-center gap-2 px-4"
              >
                <Image
                  src="/prime-video.png"
                  alt="Prime Video"
                  width={16}
                  height={16}
                  className="h-4 w-auto"
                  onError={(e) => {
                    // Fallback to text if logo doesn't load
                    e.currentTarget.style.display = 'none';
                    const button = e.currentTarget.parentElement;
                    if (button) {
                      const textSpan = button.querySelector('.prime-text');
                      if (textSpan) textSpan.textContent = 'Prime Video';
                    }
                  }}
                />
                <span className="prime-text">Invincible izle</span>
              </button>
              
              {/* Anladım Butonu */}
              <button
                onClick={handleAccept}
                disabled={isButtonDisabled}
                className={`w-fit rounded-lg border border-white/20 py-2 text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0f1420] shadow-lg px-4 ${
                  isButtonDisabled
                    ? 'bg-gray-500/50 backdrop-blur-md cursor-not-allowed opacity-70'
                    : 'bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105 active:scale-95'
                }`}
              >
                {isButtonDisabled ? countdown : 'Anladım'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}