"use client";
import Image from 'next/image';
import { Ubuntu } from "next/font/google";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiscordActivityAuth from '../components/DiscordActivityAuth';

const ubuntu = Ubuntu({ subsets: ["latin"], weight: ["400", "700"] });

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsLoading(false);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(progressTimer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Loading Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/10 to-[#7289DA]/10"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#5865F2]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#7289DA]/15 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="text-center z-10">
          <div className="relative inline-block leading-none mb-8">
            <img src="/gif/BM.gif" alt="cat" className="absolute left-1/2 transform -translate-x-1/2 translate-y-8 bottom-full block" style={{margin:0}} />
            <h1 className={`text-4xl md:text-6xl font-extrabold text-white ${ubuntu.className}`}>DiscoWeb</h1>
          </div>
          
          {/* Loading Bar */}
          <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <p className="text-[#cbd5db] text-sm animate-pulse">
            Yükleniyor... {progress}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <DiscordActivityAuth>
      <div className="h-screen text-white overflow-hidden relative">
        {/* Activity Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#5865F2]/10 to-[#7289DA]/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#5865F2]/20 rounded-full blur-3xl animate-glow-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#7289DA]/15 rounded-full blur-3xl"></div>

        <main className="relative h-full">
          <div className="absolute inset-0 z-10 px-6">
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl">
              <div className="w-full flex flex-col md:flex-row md:items-center items-center gap-8">
                <div className="flex-1 text-center md:text-left md:pl-4 lg:pl-6">
                  <h1 className={`text-3xl md:text-5xl lg:text-6xl font-extrabold text-white ${ubuntu.className}`}>DiscoWeb&apos;e Hoş Geldiniz</h1>
                  <p className="mt-4 text-sm md:text-lg text-[#cbd5db] leading-relaxed break-words px-2">
                    Discord sunucunuz için bakiye yönetimi ve rol satın alma sistemi. Dashboard&apos;a yönlendiriliyorsunuz...
                  </p>
                  <div className="mt-6">
                    <button 
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 bg-gradient-to-r from-[#5865F2] to-[#7289DA] text-white font-semibold rounded-lg hover:from-[#4752C4] hover:to-[#667EEA] transition-all duration-200 transform hover:scale-105"
                    >
                      Dashboard&apos;a Git
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-md md:max-w-lg">
                  <div className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[500px] mx-auto">
                    <Image
                      src="/gif/indir.gif"
                      alt="Discord Banner"
                      fill
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  </div>
                  <div className="mt-4">
                    <div className="relative inline-block leading-none">
                      <img src="/gif/cat.gif" alt="cat" className="absolute left-1/2 transform -translate-x-1/2 translate-y-60 bottom-full block" style={{margin:0}} />
                      <h2 className="sr-only">Decorative cat overlay</h2>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Activity Footer */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-6">
          <div className="text-center">
            <p className="text-xs text-[#99AAB5] opacity-75">
             DiscoWeb Activity | 2026 © Tüm hakları saklıdır
            </p>
          </div>
        </div>
      </div>
    </DiscordActivityAuth>
  );
}