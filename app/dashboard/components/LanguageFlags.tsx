import type { ReactNode } from 'react';
import type { LanguageCode } from '@/lib/languages';

type Props = { code: LanguageCode; className?: string };

export default function LanguageFlag({ code, className = 'h-7 w-7' }: Props) {
  return (
    <span className={`inline-flex flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${className}`}>
      {FLAGS[code]}
    </span>
  );
}

const clip = (id: string, children: ReactNode) => (
  <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
    <defs>
      <clipPath id={id}>
        <circle cx="16" cy="16" r="16" />
      </clipPath>
    </defs>
    <g clipPath={`url(#${id})`}>{children}</g>
  </svg>
);

const FLAGS: Record<LanguageCode, ReactNode> = {
  en: clip('f-en', (
    <>
      <rect width="32" height="32" fill="#B22234" />
      <rect y="2.46" width="32" height="2.46" fill="#fff" />
      <rect y="7.38" width="32" height="2.46" fill="#fff" />
      <rect y="12.31" width="32" height="2.46" fill="#fff" />
      <rect y="17.23" width="32" height="2.46" fill="#fff" />
      <rect y="22.15" width="32" height="2.46" fill="#fff" />
      <rect y="27.08" width="32" height="2.46" fill="#fff" />
      <rect width="14" height="17.23" fill="#3C3B6E" />
    </>
  )),
  pt: clip('f-pt', (
    <>
      <rect width="32" height="32" fill="#009739" />
      <polygon points="16,4 28,16 16,28 4,16" fill="#FEDD00" />
      <circle cx="16" cy="16" r="5.5" fill="#002776" />
    </>
  )),
  id: clip('f-id', (
    <>
      <rect width="32" height="16" fill="#CE1126" />
      <rect y="16" width="32" height="16" fill="#fff" />
    </>
  )),
  es: clip('f-es', (
    <>
      <rect width="32" height="8" fill="#AA151B" />
      <rect y="8" width="32" height="16" fill="#F1BF00" />
      <rect y="24" width="32" height="8" fill="#AA151B" />
    </>
  )),
  de: clip('f-de', (
    <>
      <rect width="32" height="10.67" fill="#000" />
      <rect y="10.67" width="32" height="10.67" fill="#DD0000" />
      <rect y="21.33" width="32" height="10.67" fill="#FFCE00" />
    </>
  )),
  tr: clip('f-tr', (
    <>
      <rect width="32" height="32" fill="#E30A17" />
      <circle cx="13.5" cy="16" r="5.5" fill="#fff" />
      <circle cx="15" cy="16" r="4.2" fill="#E30A17" />
      <polygon points="20,16 24.5,17.8 22.8,13.5 22.8,18.5" fill="#fff" />
    </>
  )),
  fr: clip('f-fr', (
    <>
      <rect width="10.67" height="32" fill="#002395" />
      <rect x="10.67" width="10.67" height="32" fill="#fff" />
      <rect x="21.33" width="10.67" height="32" fill="#ED2939" />
    </>
  )),
  it: clip('f-it', (
    <>
      <rect width="10.67" height="32" fill="#009246" />
      <rect x="10.67" width="10.67" height="32" fill="#fff" />
      <rect x="21.33" width="10.67" height="32" fill="#CE2B37" />
    </>
  )),
  hu: clip('f-hu', (
    <>
      <rect width="32" height="10.67" fill="#CE2939" />
      <rect y="10.67" width="32" height="10.67" fill="#fff" />
      <rect y="21.33" width="32" height="10.67" fill="#477050" />
    </>
  )),
  ja: clip('f-ja', (
    <>
      <rect width="32" height="32" fill="#fff" />
      <circle cx="16" cy="16" r="7" fill="#BC002D" />
    </>
  )),
  ko: clip('f-ko', (
    <>
      <rect width="32" height="32" fill="#fff" />
      <circle cx="16" cy="16" r="7" fill="#C60C30" />
      <path d="M16 9a7 7 0 0 1 0 14 3.5 3.5 0 0 0 0-7 3.5 3.5 0 0 1 0-7z" fill="#003478" />
    </>
  )),
  ru: clip('f-ru', (
    <>
      <rect width="32" height="10.67" fill="#fff" />
      <rect y="10.67" width="32" height="10.67" fill="#0039A6" />
      <rect y="21.33" width="32" height="10.67" fill="#D52B1E" />
    </>
  )),
};

/** Decorative background labels — one "set language" phrase per locale */
export const LANGUAGE_BG_LABELS: {
  code: LanguageCode;
  text: string;
  left: string;
  rotate: number;
  size: string;
  duration: string;
  delay: string;
}[] = [
  { code: 'en', text: 'Set language', left: '6%', rotate: -10, size: 'text-base', duration: '18s', delay: '0s' },
  { code: 'tr', text: 'Dili ayarla', left: '58%', rotate: 8, size: 'text-base', duration: '22s', delay: '-3s' },
  { code: 'de', text: 'Sprache wählen', left: '78%', rotate: -6, size: 'text-sm', duration: '20s', delay: '-7s' },
  { code: 'fr', text: 'Choisir la langue', left: '10%', rotate: 9, size: 'text-sm', duration: '24s', delay: '-11s' },
  { code: 'it', text: 'Imposta lingua', left: '62%', rotate: 7, size: 'text-sm', duration: '21s', delay: '-6s' },
  { code: 'es', text: 'Ajustar idioma', left: '48%', rotate: -8, size: 'text-base', duration: '19s', delay: '-5s' },
  { code: 'pt', text: 'Ajustar idioma', left: '28%', rotate: 5, size: 'text-sm', duration: '21s', delay: '-14s' },
  { code: 'ja', text: '言語を設定', left: '4%', rotate: -4, size: 'text-base', duration: '23s', delay: '-9s' },
  { code: 'ko', text: '언어 설정', left: '70%', rotate: 11, size: 'text-base', duration: '17s', delay: '-2s' },
  { code: 'ru', text: 'Настроить язык', left: '36%', rotate: -9, size: 'text-sm', duration: '25s', delay: '-16s' },
  { code: 'id', text: 'Atur bahasa', left: '84%', rotate: 4, size: 'text-sm', duration: '20s', delay: '-12s' },
  { code: 'hu', text: 'Nyelv beállítása', left: '20%', rotate: -5, size: 'text-sm', duration: '26s', delay: '-8s' },
];
