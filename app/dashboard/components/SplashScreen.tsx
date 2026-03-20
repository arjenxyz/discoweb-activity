'use client';

type Props = {
  onEnter: () => void;
  guildName?: string | null;
};

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Aktif ol, kazan',
    desc: 'Mesaj at, seste vakit geçir — her katkın otomatik olarak papel kazandırır.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v14H3zM8 21h8M12 17v4" />
      </svg>
    ),
    title: 'Mağaza & Roller',
    desc: 'Kazandığın papelleri sunucu mağazasından özel rol ve avantajlara dönüştür.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Sıralamalar',
    desc: 'Sunucudaki en aktif üyeler liderlik tablosunda. Yerini al.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Sunucu Postası',
    desc: 'Yöneticilerden gelen özel duyurular ve mesajlar doğrudan panelinde.',
  },
];

export default function SplashScreen({ onEnter, guildName }: Props) {
  return (
    <div className="flex min-h-screen w-full flex-col items-start justify-end px-5 pb-8 sm:px-8 sm:pb-10">
      {/* Sol alt — içerik */}
      <div className="flex w-full max-w-lg flex-col gap-6">
        {/* Sunucu etiketi */}
        {guildName && (
          <p className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 backdrop-blur-md">
            {guildName}
          </p>
        )}

        {/* Başlık */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-5xl font-black leading-tight tracking-tight text-white"
            style={{ textShadow: '0 0 40px rgba(255,255,255,0.15), 0 2px 16px rgba(0,0,0,1)' }}
          >
            DiscoWeb
          </h1>
          <p className="text-sm text-white/55 leading-relaxed max-w-sm" style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}>
            Sunucuna özel ekonomi platformu. Katkında karşılıksız kalmaz.
          </p>
        </div>

        {/* Özellik kartları */}
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-md"
            >
              <span className="text-white/50">{f.icon}</span>
              <p className="text-xs font-bold text-white/90">{f.title}</p>
              <p className="text-xs text-white/45 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onEnter}
          className="self-start rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition hover:bg-white/90 active:scale-95"
          style={{ boxShadow: '0 0 32px rgba(255,255,255,0.15)' }}
        >
          Keşfet
        </button>
      </div>
    </div>
  );
}
