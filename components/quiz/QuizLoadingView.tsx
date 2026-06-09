'use client';

import { LuTrophy } from 'react-icons/lu';
import { QuizShell } from './QuizShell';

export function QuizLoadingView({ label }: { label: string }) {
  return (
    <QuizShell variant="idle">
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-400/15 border-t-amber-400/80" />
          <LuTrophy className="absolute inset-0 m-auto h-7 w-7 text-amber-300/70 animate-quiz-float-trophy" />
        </div>
        <p className="text-sm font-medium text-white/45">{label}</p>
      </div>
    </QuizShell>
  );
}
