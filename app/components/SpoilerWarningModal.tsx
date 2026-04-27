'use client';

import { useState, useEffect } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

export default function SpoilerWarningModal() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the warning
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-2xl">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-amber-500/15 p-3">
            <LuTriangleAlert className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-3 text-center text-xl font-bold text-white">
          ⚠️ Spoiler Uyarısı
        </h2>

        {/* Content */}
        <div className="mb-6 space-y-3 text-center text-sm text-white/80">
          <p>
            Bu uygulama <strong className="text-amber-400">Invincible</strong> dizisinin bir fan projesidir.
          </p>
          <p>
            İçeriklerimizde <strong className="text-red-400">spoiler</strong> bulunmaktadır.
          </p>
          <p className="text-xs text-white/60">
            Diziyi henüz izlememişseniz dikkatli olun!
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleAccept}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#121827]"
        >
          Anladım
        </button>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-white/50">
          Bu uyarı bir daha gösterilmeyecektir.
        </p>
      </div>
    </div>
  );
}