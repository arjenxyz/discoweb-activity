'use client';

import { useState } from 'react';
import { LuTriangleAlert, LuAlertTriangle } from 'react-icons/lu';

export default function SpoilerWarningModal() {
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has already seen the warning
    if (typeof window === 'undefined') return false;
    const hasSeenWarning = localStorage.getItem('hasSeenSpoilerWarning');
    return !hasSeenWarning;
  });

  const handleAccept = () => {
    localStorage.setItem('hasSeenSpoilerWarning', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#121827]/95 p-6 shadow-2xl overflow-hidden">
        {/* Background Video */}
        <video
          className="absolute inset-0 w-full h-full object-cover rounded-2xl"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/video/invincible.mp4" type="video/mp4" />
          {/* Fallback image if video doesn't load */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl" />
        </video>

        {/* Logo in top-left corner */}
        <img
          src="/logo.png"
          alt="Logo"
          className="absolute top-4 left-4 z-20 h-8 w-auto rounded-lg shadow-lg"
        />

        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-black/40 rounded-2xl" />

        {/* Content Overlay */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-amber-500/20 backdrop-blur-sm p-3 border border-amber-400/30">
              <LuTriangleAlert className="h-8 w-8 text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <LuAlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-center text-xl font-bold text-white drop-shadow-lg">
              Spoiler Uyarısı
            </h2>
          </div>

          {/* Content */}
          <div className="mb-6 space-y-3 text-center text-sm text-white/90 drop-shadow-md">
            <p className="backdrop-blur-sm bg-black/20 rounded-lg px-3 py-2">
              Bu uygulama <strong className="text-amber-400">Invincible</strong> dizisinin bir fan projesidir.
            </p>
            <p className="backdrop-blur-sm bg-black/20 rounded-lg px-3 py-2">
              İçeriklerimizde <strong className="text-red-400">spoiler</strong> bulunmaktadır.
            </p>
            <p className="text-xs text-white/80 backdrop-blur-sm bg-black/20 rounded-lg px-3 py-2">
              Diziyi henüz izlememişseniz dikkatli olun!
            </p>
          </div>

          {/* Button */}
          <button
            onClick={handleAccept}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-sm border border-white/10 shadow-lg"
          >
            Anladım
          </button>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-white/70 backdrop-blur-sm bg-black/20 rounded-lg px-3 py-2">
            Bu uyarı bir daha gösterilmeyecektir.
          </p>
        </div>
      </div>
    </div>
  );
}