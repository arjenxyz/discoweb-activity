'use client';

import { useState, useEffect } from 'react';

export default function SpoilerWarningModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Component yüklendiğinde kullanıcının uyarıyı görüp görmediğini kontrol et
    const hasSeenWarning = localStorage.getItem('hasSeenSpoilerWarning');
    if (!hasSeenWarning) {
      setIsVisible(true);
    }
  }, []);

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

          {/* Alt Kısım: Not ve Buton */}
          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6 mt-auto">
            <p className="text-sm text-gray-400 font-medium">
              Bu uyarıyı bir daha karşına çıkarmayacağız, söz!
            </p>
            
            {/* Büyütülmüş Sağ Alt Buton */}
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
  );
}