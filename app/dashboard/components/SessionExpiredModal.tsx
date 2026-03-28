'use client';

import { useState } from 'react';
import { LuShieldOff, LuLoader, LuLogIn } from 'react-icons/lu';

type Props = {
  loginUrl: string;
};

export default function SessionExpiredModal({ loginUrl }: Props) {
  const [clearing, setClearing] = useState(false);

  const handleRelogin = async () => {
    setClearing(true);
    try {
      // Logout endpoint'i çerezleri temizler ve Discord yetkilerini sıfırlar
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
    } catch {
      // Hata olsa bile devam et — çerezler zaten sunucu tarafında sıfırlandı
    }
    // Discord OAuth'a yönlendir (yetki ekranı tekrar gösterilir)
    window.location.href = loginUrl;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-[28px] border border-rose-500/30 bg-[#0f111a] shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-rose-500/15 blur-[60px] pointer-events-none" />

        <div className="relative z-10 p-8 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/25">
            <LuShieldOff className="w-7 h-7 text-rose-400" />
          </div>

          {/* Text */}
          <div>
            <h2 className="text-lg font-bold text-white">Oturumunuz Sonlandı</h2>
            <p className="mt-2 text-sm text-white/50 leading-relaxed">
              Güvenliğiniz için oturum süresi doldu. Devam etmek için Discord hesabınızla tekrar giriş yapın.
            </p>
          </div>

          {/* Info chips */}
          <div className="w-full flex flex-col gap-1.5 text-left rounded-xl bg-white/5 border border-white/8 p-3">
            <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-1">Yapılacaklar</p>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[9px] text-rose-400 font-bold shrink-0">1</span>
              Mevcut oturum çerezleri temizlenir
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[9px] text-rose-400 font-bold shrink-0">2</span>
              Discord yetki ekranına yönlendirilirsiniz
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[9px] text-rose-400 font-bold shrink-0">3</span>
              Yetkiler güncellenerek yeni oturum açılır
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => void handleRelogin()}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {clearing ? (
              <>
                <LuLoader className="w-4 h-4 animate-spin" />
                Hazırlanıyor...
              </>
            ) : (
              <>
                <LuLogIn className="w-4 h-4" />
                Discord ile Tekrar Giriş Yap
              </>
            )}
          </button>

          <p className="text-[10px] text-white/25">
            Oturumlar güvenlik nedeniyle 3 günde bir yenilenmektedir.
          </p>
        </div>
      </div>
    </div>
  );
}
