'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

export default function SpoilerWarningModal() {
  const [isVisible, setIsVisible] = useState(false);
  const { locale } = useLocale();

  // Prime Video URL'sini locale'e göre belirle
  const getPrimeVideoUrl = (locale: string) => {
    const localeMap: Record<string, string> = {
      'tr': 'https://www.amazon.com.tr/gp/video/detail/B08B8Z8Z8Z', // Invincible on Turkish Amazon Prime
      'en': 'https://www.amazon.com/gp/video/detail/B08B8Z8Z8Z', // Invincible on US Amazon Prime
      'pt-br': 'https://www.amazon.com.br/gp/video/detail/B08B8Z8Z8Z', // Invincible on Brazilian Amazon Prime
      'es': 'https://www.amazon.es/gp/video/detail/B08B8Z8Z8Z', // Invincible on Spanish Amazon Prime
      'fr': 'https://www.amazon.fr/gp/video/detail/B08B8Z8Z8Z', // Invincible on French Amazon Prime
      'de': 'https://www.amazon.de/gp/video/detail/B08B8Z8Z8Z', // Invincible on German Amazon Prime
      'it': 'https://www.amazon.it/gp/video/detail/B08B8Z8Z8Z', // Invincible on Italian Amazon Prime
      'ja': 'https://www.amazon.co.jp/gp/video/detail/B08B8Z8Z8Z', // Invincible on Japanese Amazon Prime
      'ko': 'https://www.amazon.co.kr/gp/video/detail/B08B8Z8Z8Z', // Invincible on Korean Amazon Prime
      'zh-CN': 'https://www.amazon.cn/gp/video/detail/B08B8Z8Z8Z', // Invincible on Chinese Amazon Prime
      'zh-TW': 'https://www.amazon.com/gp/video/detail/B08B8Z8Z8Z', // Invincible on Taiwanese Amazon Prime (redirect to US)
    };
    
    // Browser locale'ini al (daha detaylı)
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
    
    // Önce tam locale eşleşmesi dene (zh-CN gibi)
    if (localeMap[browserLocale]) {
      return localeMap[browserLocale];
    }
    
    // Sonra dil kodu ile dene (zh-CN -> zh)
    const langCode = browserLocale.split('-')[0];
    if (localeMap[langCode]) {
      return localeMap[langCode];
    }
    
    // Varsayılan olarak US Amazon Prime
    return localeMap['en'];
  };

  const handleWatchInvincible = () => {
    const primeUrl = getPrimeVideoUrl(locale);
    window.open(primeUrl, '_blank');
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
        <img
          src="/logo.png"
          alt="Logo"
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
              Arşivimizde dizinin kritik anlarına dair <strong className="text-red-500 font-bold">spoiler'lar</strong> yer almaktadır.
            </p>
            <p className="text-gray-300 italic">
              Eğer serüveni henüz tamamlamadıysan, yolculuğuna gölge düşmemesi için dikkatli ol!
            </p>
          </div>

          {/* Alt Kısım: Not ve Butonlar */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 mt-auto">
            <p className="text-sm text-gray-400 font-medium">
              Bu uyarıyı bir daha karşına çıkarmayacağız, söz!
            </p>
            
            {/* Butonlar */}
            <div className="flex gap-3">
              {/* Watch Button with Prime Video Logo */}
              <button
                onClick={handleWatchInvincible}
                className="shrink-0 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 text-base font-bold text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0f1420] shadow-lg flex items-center gap-2"
              >
                <img
                  src="/icons/prime-video-logo.svg"
                  alt="Prime Video"
                  className="h-5 w-auto"
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
                <span className="prime-text">İzle</span>
              </button>
              
              {/* Anladım Butonu */}
              <button
                onClick={handleAccept}
                className="shrink-0 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3.5 text-base font-bold text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0f1420] shadow-lg"
              >
                Anladım
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}