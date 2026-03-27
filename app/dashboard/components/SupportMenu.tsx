'use client';

import { useState, useRef, useEffect } from 'react';
import BugReportModal from './BugReportModal';

type Props = {
  openLink: (url: string) => Promise<void>;
};

export default function SupportMenu({ openLink }: Props) {
  const [open, setOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/70 backdrop-blur-sm transition hover:bg-black/35 hover:text-white"
          aria-label="Destek"
        >
          {/* Soru işareti / kulaklık ikonu */}
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-52 rounded-xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden z-30">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="py-1.5">
              <MenuItem
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                  </svg>
                }
                label="Destek Sunucusu"
                sub="Discord'da yardım al"
                onClick={() => { setOpen(false); openLink('https://discord.gg/fDPsYhvKmu'); }}
              />
              <MenuItem
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zm0 5A.75.75 0 011.75 12h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 011 12.75z" />
                  </svg>
                }
                label="Belgeler"
                sub="Kullanım kılavuzu"
                onClick={() => { setOpen(false); openLink('https://discoweb.tech/docs'); }}
              />
              <div className="my-1 h-px bg-white/5 mx-3" />
              <MenuItem
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-red-400">
                    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                  </svg>
                }
                label="Hata Bildir"
                sub="Ekran görüntüsü ekle"
                danger
                onClick={() => { setOpen(false); setBugOpen(true); }}
              />
            </div>
          </div>
        )}
      </div>

      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} />}
    </>
  );
}

function MenuItem({ icon, label, sub, onClick, danger = false }: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/5 ${danger ? 'text-red-400 hover:text-red-300' : 'text-white/80 hover:text-white'}`}
    >
      <span className="flex-shrink-0 opacity-70">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold leading-none">{label}</span>
        <span className="text-[11px] text-white/30 leading-none">{sub}</span>
      </div>
    </button>
  );
}
