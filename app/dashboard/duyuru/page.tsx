'use client';

import Image from 'next/image';
import { LuHeart } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import type { StoreItem } from '../types';

function ShopCard({ item }: { item: StoreItem }) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/5 shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-white/20">
      <div className="relative overflow-hidden rounded-[24px] bg-slate-950/80">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-950/40 to-slate-900/80" />
        <div className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
          {item.status === 'active' ? 'Active' : item.status}
        </div>
        <button className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-2xl bg-black/40 text-white/80 transition hover:bg-white/10">
          <LuHeart className="h-4.5 w-4.5" />
        </button>
        <div className="relative h-40 p-3.5">
          <div className="flex h-full flex-col justify-end">
            <div className="space-y-3">
              <div className="h-16 w-full rounded-[20px] bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-black border border-white/5 shadow-inner shadow-black/20">
                <div className="flex h-full items-center justify-center px-3 text-center text-sm font-semibold text-white">
                  {item.title}
                </div>
              </div>
              {item.description && (
                <p className="text-xs leading-5 text-slate-300 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black tracking-tight text-white">{item.title}</h3>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            {item.status === 'active' ? 'Hot' : 'New'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-black text-white">TRY {item.price.toFixed(2)}</p>
          <button className="rounded-full bg-[#5865F2] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white transition hover:bg-[#4752c4]">
            Shop
          </button>
        </div>
      </div>
    </article>
  );
}

function StoreGrid() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetchWithCreds('/api/member/store?page=1&limit=20');
        if (response.ok) {
          const data = (await response.json()) as { items: StoreItem[] };
          setItems(data.items ?? []);
        }
      } catch (err) {
        console.warn('Store items load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  return (
    <div className="mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
      {loading
        ? Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-[24px] border border-white/10 bg-white/5 p-6"
            />
          ))
        : items.length > 0
        ? items.map((item) => <ShopCard key={item.id} item={item} />)
        : (
            <div className="md:col-span-4 rounded-[24px] border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
              No products found in Supabase store_items.
            </div>
          )}
    </div>
  );
}

export default function DuyuruPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 z-0">
        <Image
          src="/menu-background/varyant6.jpg"
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

        <StoreGrid />
      </div>
    </div>
  );
}
