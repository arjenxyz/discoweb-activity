'use client';

type Props = {
  onClose: () => void;
};

export default function DeveloperAboutModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Subtle gradient accent top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-[#5865F2]/10 blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition z-10"
          aria-label="Kapat"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>

        <div className="relative px-8 pt-8 pb-7 flex flex-col gap-6">
          {/* Developer info */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src="https://cdn.discordapp.com/avatars/1163500308270436442/8c2eeba5e9c137e4f9375bccb0f0bf40.png?size=128"
                alt="thearjen"
                className="h-16 w-16 rounded-full ring-1 ring-white/10"
              />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#5865F2] flex items-center justify-center ring-2 ring-[#0b0d12]">
                <svg viewBox="0 0 16 16" fill="white" className="h-2.5 w-2.5">
                  <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 01-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 01.872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 012.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 012.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 01.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 01-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 01-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 110-5.858 2.929 2.929 0 010 5.858z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-white">thearjen</span>
              <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Developer & Designer</span>
              <span className="text-xs text-white/50 leading-relaxed mt-0.5">
                DiscoWeb'in tek geliştiricisi. Full-stack web ve Discord uygulamaları üzerine çalışıyor.
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5" />

          {/* Teşekkürler */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Teşekkürler</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="flex flex-col gap-2">
              <ThanksRow name="Discord" desc="Gömülü uygulama platformu için" />
              <ThanksRow name="Next.js & Vercel" desc="Altyapı ve barındırma için" />
              <ThanksRow name="Tüm kullanıcılar" desc="Geri bildirim ve destek için" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-white/20">© {new Date().getFullYear()} DiscoWeb · All rights reserved</span>
            <span className="text-[10px] text-white/20">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThanksRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-2.5">
      <div className="h-1.5 w-1.5 rounded-full bg-[#5865F2]/70 flex-shrink-0" />
      <span className="text-sm font-semibold text-white/70">{name}</span>
      <span className="text-xs text-white/30 ml-auto text-right">{desc}</span>
    </div>
  );
}
