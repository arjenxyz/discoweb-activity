'use client';

import Image from 'next/image';
import { LuHeart, LuGift } from 'react-icons/lu';

const shopItems = [
  {
    title: 'Star Struck Bundle',
    price: 'TRY 168.99',
    badge: 'Featured',
    isFeatured: true,
  },
  {
    title: 'Story Time Bundle',
    price: 'TRY 168.99',
    badge: '-11%',
    isFeatured: false,
  },
  {
    title: 'Cloud Nine',
    price: 'TRY 62.99',
    badge: 'Popular',
    isFeatured: false,
  },
  {
    title: 'Slow Burn',
    price: 'TRY 62.99',
    badge: 'Cozy',
    isFeatured: false,
  },
];

function ShopCard({ item }: { item: typeof shopItems[number] }) {
  return (
    <article className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-white/20">
      <div className="relative overflow-hidden rounded-[32px] bg-slate-950/80">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-950/40 to-slate-900/80" />
        <div className="absolute top-4 left-4 rounded-full bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
          {item.badge}
        </div>
        <button className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-black/40 text-white/80 transition hover:bg-white/10">
          <LuHeart className="h-5 w-5" />
        </button>
        <div className="relative h-72 p-6">
          <div className="flex h-full flex-col justify-end">
            <div className="space-y-4">
              <div className="h-24 w-full rounded-[28px] bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-black border border-white/5 shadow-inner shadow-black/20" />
              {item.isFeatured && (
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/50 px-4 py-3 text-white/90 backdrop-blur-xl">
                  <div className="h-11 w-11 rounded-2xl bg-slate-500/40" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">Featured</p>
                    <p className="mt-1 text-sm font-black text-white">Arjen 🐱‍👤</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 pb-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black tracking-tight text-white">{item.title}</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{item.isFeatured ? 'Hot' : 'New'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-black text-white">{item.price}</p>
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-[#5865F2] px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-[#4752c4]">
              Shop
            </button>
            {item.isFeatured && (
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
                <LuGift className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function DuyuruPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#05060b] text-white">
      <div className="fixed inset-0 z-0">
        <Image
          src="/menu-background/varyant5.jpg"
          alt="Market background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.2),transparent_18%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.18),transparent_18%),linear-gradient(180deg,rgba(7,11,19,0.88),rgba(7,11,19,1))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1380px] px-5 py-10 sm:px-8 sm:py-12">
        <section className="rounded-[40px] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-200">
                Announcements
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Cozy Getaway</h1>
                <p className="max-w-xl text-sm leading-7 text-slate-300">
                  Open the market menu and discover featured bundles, limited drops, and seasonal offers in a polished shop layout.
                </p>
              </div>
            </div>
            <button className="flex-shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-black/20 transition hover:bg-slate-100">
              Shop the Collection
            </button>
          </div>
        </section>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {shopItems.map((item) => (
            <ShopCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
