'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { LuCircleCheck, LuPlay, LuPause, LuX, LuGift } from 'react-icons/lu';

const TASKS = [
  {
    id: 'exodus',
    title: 'EXODUS GAMEPLAY GÖREVİ',
    sponsor: 'Wizards of the Coast',
    endDate: '13.06',
    reward: 200,
    multiplier: '1,2 kat kilit aç',
    banner: '/menu-background/varyant.jpg',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    logoText: 'EXODUS',
  },
  {
    id: 'monopoly',
    title: 'MONOPOLY GO! GÖREVİ',
    sponsor: 'Scopely',
    endDate: '15.06',
    reward: 200,
    multiplier: '1,2 kat kilit aç',
    banner: '/menu-background/varyant2.jpg',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    logoText: 'MONOPOLY GO!',
  },
  {
    id: 'aion',
    title: 'AION 2 GÖREVİ',
    sponsor: 'NC',
    endDate: '15.06',
    reward: 200,
    multiplier: '1,2 kat kilit aç',
    banner: '/menu-background/varyant3.jpg',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    logoText: 'AION 2',
  },
];

export default function WatchEarnSection() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [watchedTasks, setWatchedTasks] = useState<Record<string, boolean>>({});
  const [claimedTasks, setClaimedTasks] = useState<Record<string, boolean>>({});
  
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({ open: false, message: '' });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  };

  useEffect(() => {
    if (activeVideo && videoRef.current) {
      videoRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [activeVideo]);

  const handleVideoEnded = () => {
    if (activeVideo) {
      setWatchedTasks(prev => ({ ...prev, [activeVideo]: true }));
      setActiveVideo(null);
      showToast('Görevi tamamladın! Şimdi ödülünü alabilirsin.', 'success');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleClaim = (id: string) => {
    setClaimedTasks(prev => ({ ...prev, [id]: true }));
    showToast('Ödül başarıyla hesabınıza eklendi!', 'success');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">İzle Kazan Görevleri</h1>
          <p className="text-sm text-white/50 mt-1">Videoları sonuna kadar izleyerek Papel ödüllerini topla.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {TASKS.map(task => {
          const isWatched = watchedTasks[task.id];
          const isClaimed = claimedTasks[task.id];

          return (
            <div key={task.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1e1f25] shadow-lg">
              {/* Banner Area */}
              <div className="relative h-36 w-full">
                <Image src={task.banner} alt={task.title} fill className="object-cover opacity-70" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1e1f25] via-[#1e1f25]/60 to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white italic tracking-wider mb-2 drop-shadow-md">
                      {task.logoText}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                      <span>Tarafından sunuluyor</span>
                      <LuCircleCheck className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-white">{task.sponsor}</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-white/50">
                    Bitiş: {task.endDate}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex flex-col md:flex-row items-start md:items-center gap-5">
                {/* Details */}
                <div className="flex-1 space-y-2">
                  <h4 className="text-lg font-bold text-white uppercase tracking-wide">{task.title}</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Image src="/papel.gif" alt="Papel" width={18} height={18} unoptimized />
                      <span className="text-lg">{task.reward} Papel</span>
                    </div>
                    <div className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <LuPlay className="h-3 w-3" />
                      {task.multiplier}
                    </div>
                  </div>
                  {isClaimed && (
                    <p className="text-xs text-white/40 font-medium">Bu ödülü {new Date().toLocaleDateString('tr-TR')} tarihinde aldın</p>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 w-full md:w-auto flex items-center gap-2">
                  {!isWatched && !isClaimed && (
                    <button
                      onClick={() => setActiveVideo(task.id)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] px-8 py-3.5 text-sm font-bold text-white transition-colors shadow-lg shadow-[#5865F2]/20"
                    >
                      <LuPlay className="h-5 w-5" />
                      İzle
                    </button>
                  )}

                  {isWatched && !isClaimed && (
                    <button
                      onClick={() => handleClaim(task.id)}
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <LuGift className="h-5 w-5" />
                      Ödülü Al
                    </button>
                  )}

                  {isClaimed && (
                    <button
                      disabled
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-white/5 px-8 py-3.5 text-sm font-bold text-white/40 cursor-not-allowed border border-white/10"
                    >
                      Ödül Alındı
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* Modal Header */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center">
              <p className="text-white font-bold drop-shadow-md">
                Görevi tamamlamak için videoyu sonuna kadar izle!
              </p>
              <button 
                onClick={() => {
                  setActiveVideo(null);
                  showToast('Videoyu kapattığın için ödül kazanamadın.', 'error');
                }}
                className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video w-full group cursor-pointer" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={TASKS.find(t => t.id === activeVideo)?.videoUrl}
                className="h-full w-full object-contain"
                onEnded={handleVideoEnded}
                playsInline
                disablePictureInPicture
                controlsList="nodownload noplaybackrate"
                onContextMenu={e => e.preventDefault()}
              />
              
              {/* Play/Pause Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
                  <div className="h-20 w-20 bg-[#5865F2] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#5865F2]/50 pl-1.5">
                    <LuPlay className="h-10 w-10" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#1e1f25] p-4 text-center">
              <p className="text-sm text-white/50">Video oynatıcısında ileri saramazsınız. Ödülü kazanmak için videonun bitmesini bekleyin.</p>
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast.open && (
        <div className="fixed bottom-6 right-6 z-[60] animate-in fade-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
