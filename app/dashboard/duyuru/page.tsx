'use client';

import { useRef } from 'react';
import { VideoBackground } from '@/app/dashboard/components/VideoBackground';

export default function DuyuruPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <VideoBackground videoRef={videoRef} src="/cdn/Storage/invincible2.mp4" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <div className="max-w-2xl text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-blue-200/70 mb-4">Yakında</p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white">Çok Yakında Gelecek</h1>
          <p className="mt-6 text-lg leading-8 text-gray-300">Duyuru sayfası yakında açılacak. Hazırlanıyoruz, sabırlı olun.</p>
        </div>
      </div>
    </div>
  );
}
