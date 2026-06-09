'use client';

export function QuizTimerRing({
  secondsLeft,
  totalSeconds,
  urgent,
}: {
  secondsLeft: number;
  totalSeconds: number;
  urgent?: boolean;
}) {
  const size = 56;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const offset = circumference * (1 - pct);
  const color = urgent ? '#f87171' : secondsLeft <= 10 ? '#fbbf24' : '#34d399';

  return (
    <div className={`relative ${urgent ? 'animate-quiz-pulse-urgent' : ''}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-mono text-sm font-black tabular-nums ${
          urgent ? 'text-rose-400' : 'text-white'
        }`}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
