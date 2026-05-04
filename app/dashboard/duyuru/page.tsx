'use client';

import Image from 'next/image';
import { LuHeart, LuGift, LuArrowRight } from 'react-icons/lu';

const shopItems = [
  {
    title: 'Star Struck Bundle',
    price: 'TRY 168.99',
    label: 'Buy for',
    badge: 'New',
    hero: true,
    description: 'Premium bundle with avatar frames, chat themes and skins.',
    accent: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'Story Time Bundle',
    price: 'TRY 168.99',
    label: 'Bundle',
    badge: '-11%',
    description: 'Limited edition seasonal set with animated stickers.',
    accent: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Cloud Nine',
    price: 'TRY 62.99',
    label: 'Single Item',
    description: 'Dreamy avatar and voice theme package.',
    accent: 'from-sky-400 to-indigo-600',
  },
  {
    title: 'Slow Burn',
    price: 'TRY 62.99',
    label: 'Single Item',
    description: 'Cozy campfire soundscape bundle.',
    accent: 'from-rose-500 to-red-500',
  },
];

function ShopCard({ item }: { item: typeof shopItems[number] }) {
  return (
    <article className={`group overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20`}>
      <div className="relative overflow-hidden rounded-3xl bg-slate-950/90 p-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-20`} />
        <div className="relative flex items-start justify-between gap-3 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">{item.label}</p>
            <h2 className="mt-3 text-xl font-black tracking-tight text-white">{item.title}</h2>
          </div>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            {item.badge}
          </span>
        </div>
        <div className="mt-5 h-48 rounded-[26px] bg-gradient-to-br from-white/5 to-white/0 p-4">
          <div className="flex h-full flex-col justify-between rounded-[26px] border border-white/5 bg-slate-900/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/10" />
                <div>
                  <p className="text-sm font-semibold text-white">Arjen</p>
                  <p className="text-[11px] text-white/40">Around the campfire</p>
                </div>
              </div>
              <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-white/80 transition hover:bg-white/10">
                <LuHeart className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p>{item.description}</p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="inline-flex h-8 min-w-[64px] items-center justify-center rounded-2xl bg-white/5 text-white/80">+3 items</span>
                <span className="inline-flex items-center gap-1 text-white/60">
                  <LuGift className="h-3.5 w-3.5" />
                  Gift ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-white/40">Price</p>
          <p className="mt-1 text-2xl font-black text-white">{item.price}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          Shop
          <LuArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export default function DuyuruPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0">
        <Image src="/menu-background/varyant5.jpg" alt="Market background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-slate-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.16),transparent_20%),radial-gradient(circle_at_top_right,_rgba(96,165,250,0.16),transparent_18%)] mix-blend-screen" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white/70 shadow-sm shadow-black/20">
              Cozy Getaway
            </div>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-blue-200/80">Market Menu</p>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Discover this season’s most cozy bundles.</h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">Open our market menu and explore featured bundles, seasonal drops, and limited collection items. Your page now reflects the shop-style layout you asked for.</p>
            </div>
          </div>
          <div className="flex justify-start lg:justify-end">
            <button className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-black/20 transition hover:bg-slate-100">
              Shop the Collection
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {shopItems.map(item => (<ShopCard key={item.title} item={item} />))}
        </div>
      </div>
    </div>
  );
}
