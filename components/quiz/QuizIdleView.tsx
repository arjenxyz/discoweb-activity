'use client';

import { LuCalendar, LuCoins, LuSparkles, LuTrophy, LuUsers, LuZap } from 'react-icons/lu';
import { QuizShell } from './QuizShell';

const SPARKLES = [
  { top: '12%', left: '18%', delay: '0s', size: 6 },
  { top: '22%', left: '78%', delay: '0.8s', size: 5 },
  { top: '68%', left: '14%', delay: '1.4s', size: 4 },
  { top: '58%', left: '82%', delay: '0.3s', size: 5 },
  { top: '38%', left: '8%', delay: '1.9s', size: 4 },
];

const PERKS = [
  { icon: LuCoins, label: 'Papel ödülü', color: 'text-amber-300' },
  { icon: LuZap, label: 'Canlı sorular', color: 'text-violet-300' },
  { icon: LuUsers, label: 'Sunucu etkinliği', color: 'text-sky-300' },
] as const;

export function QuizIdleView() {
  return (
    <QuizShell variant="idle">
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute animate-quiz-sparkle rounded-full bg-amber-200/80"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-violet-300/90">Quiz arenası</p>

        <div className="relative mt-6">
          <div className="absolute inset-0 m-auto h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative flex h-24 w-24 animate-quiz-float-trophy items-center justify-center rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-400/25 to-violet-500/20 shadow-[0_16px_48px_rgba(251,191,36,0.18)]">
            <LuTrophy className="h-11 w-11 text-amber-200" strokeWidth={1.5} />
          </div>
          <LuSparkles className="absolute -right-2 -top-1 h-5 w-5 text-amber-200/80 animate-quiz-sparkle" />
        </div>

        <h2 className="mt-8 text-2xl font-black text-white sm:text-3xl">Sırada quiz yok</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
          Yakında yeni bir etkinlik açıldığında burada belirecek. Hazır ol — sorular hızlı gelir!
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {PERKS.map(({ icon: Icon, label, color }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-sm"
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/40 backdrop-blur-sm">
          <LuCalendar className="h-4 w-4 shrink-0 text-indigo-300/80" />
          <span>Duyurular ve etkinlik takvimini kontrol etmeyi unutma</span>
        </div>
      </div>
    </QuizShell>
  );
}
