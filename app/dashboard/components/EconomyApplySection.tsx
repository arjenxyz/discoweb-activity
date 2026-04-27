'use client';

export default function EconomyApplySection() {
  return (
    <section className="relative flex-1 min-h-0 w-full overflow-hidden">
      <video
        src="/video/invincible.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

      <p className="pointer-events-none absolute bottom-4 right-5 text-xs font-medium tracking-wide text-white/55 sm:bottom-6 sm:right-8">
        Yakında kullanıma sunulacak.
      </p>
    </section>
  );
}
