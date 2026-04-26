'use client';

import Image from 'next/image';

export default function EconomyApplySection() {
  return (
    <section className="relative flex min-h-[70vh] w-full items-center justify-center px-4 py-8 sm:px-8">
      <div className="relative w-full max-w-3xl">
        <Image
          src="/yakinda.png"
          alt="Yakinda"
          width={1200}
          height={800}
          className="h-auto w-full object-contain"
          priority
        />
      </div>

      <p className="pointer-events-none absolute bottom-4 right-5 text-xs font-medium tracking-wide text-white/55 sm:bottom-6 sm:right-8">
        Yakında kullanıma sunulacak.
      </p>
    </section>
  );
}
