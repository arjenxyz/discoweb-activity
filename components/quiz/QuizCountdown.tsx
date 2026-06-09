'use client';

import { useEffect, useState } from 'react';

const STEPS = ['3', '2', '1', 'BAŞLA!'] as const;

export function QuizCountdown({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      setStep(0);
      return;
    }
    setVisible(true);
    setStep(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) {
        clearInterval(iv);
        setVisible(false);
        onComplete();
        return;
      }
      setStep(i);
    }, 750);
    return () => clearInterval(iv);
  }, [active, onComplete]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <span
        key={step}
        className="animate-quiz-countdown-pop font-black uppercase tracking-[0.2em] text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
        style={{
          fontSize: step === STEPS.length - 1 ? 'clamp(2.5rem, 12vw, 4rem)' : 'clamp(4rem, 22vw, 7rem)',
          color: step === STEPS.length - 1 ? '#fbbf24' : '#fff',
        }}
      >
        {STEPS[step]}
      </span>
    </div>
  );
}
