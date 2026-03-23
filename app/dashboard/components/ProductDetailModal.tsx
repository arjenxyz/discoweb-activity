'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoreItem } from '../types';
import { LuClock, LuShield, LuTag, LuX, LuShoppingCart, LuZap, LuStore } from 'react-icons/lu';
import Image from 'next/image';
import { useT } from '@/contexts/LocaleContext';

export default function ProductDetailModal({
  item,
  onClose,
  onAddToCart,
  onPurchase
}: {
  item: StoreItem | null;
  onClose: () => void;
  onAddToCart: (it: StoreItem) => void;
  onPurchase: (id: string) => void;
}) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    // reset added state when a new item is opened or modal reopened
    setAddedToCart(false);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const imgSrc = (item as any).image_url || (item as any).gif_url || '/gif/giphy.gif';
  const price = (item as any).price ?? (item as any).amount ?? 0;
  const durationDays = (item as any).duration_days ?? 0;
  const isRoleItem = !!(item as any).role_id;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl bg-[#0b0d12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-auto md:max-h-[85vh]">

        {/* --- SOL TARAFA: GÖRSEL ALANI --- */}
        <div className="relative hidden md:flex w-5/12 bg-gradient-to-br from-zinc-900 to-[#050505] items-center justify-center p-8 overflow-hidden group border-r border-white/5">

          {/* Marka Badge (Glass Effect) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 pr-3 pl-1.5 py-1.5 rounded-full shadow-lg hover:bg-black/40 transition-colors">
             <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 bg-zinc-800">
                <Image
                    src="/gif/cat.gif"
                    alt="Logo"
                    fill
                    className="object-cover"
                    unoptimized
                />
             </div>
             <span className="text-white/90 font-bold text-[11px] tracking-wider font-sans uppercase">DiscoWeb</span>
          </div>

          {/* Arka Plan Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-500/10 blur-[80px] rounded-full animate-pulse" />

          {/* Ürün Görseli */}
          <div className="relative z-10 w-full aspect-square flex items-center justify-center transform transition duration-500 group-hover:scale-105">
            <img src={imgSrc} alt={item.title} className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
        </div>

        {/* --- SAĞ TARAF: İÇERİK --- */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b0d12]">

          {/* 1. Header (Başlık ve Kapatma) */}
          <div className="flex-shrink-0 flex items-start justify-between p-6 pb-2">
            <div className="min-w-0 pr-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight truncate tracking-tight">{item.title}</h2>
            </div>
            <button
                onClick={onClose}
                className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all flex-shrink-0"
            >
              <LuX size={22} />
            </button>
          </div>

          {/* 2. Scrollable Body (Etiketler ve Açıklama) */}
          <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">

            {/* Mobil Görsel */}
            <div className="md:hidden mb-6 flex justify-center bg-zinc-900/50 rounded-xl p-6 relative border border-white/5">
                 <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded-full">
                    <Image src="/gif/cat.gif" width={16} height={16} alt="L" className="rounded-full" unoptimized/>
                    <span className="text-[10px] text-white font-bold">DiscoWeb</span>
                 </div>
                 <img src={imgSrc} alt={item.title} className="h-40 object-contain drop-shadow-xl" />
            </div>

            {/* --- ETİKETLER ALANI --- */}
            <div className="flex flex-wrap items-center gap-2 mb-6 mt-2">
                {/* Mağaza Etiketi */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-700/50">
                    <LuStore size={12} />
                    <span>{(item as any).brand ?? t('store_product_default_brand')}</span>
                </div>

                {/* Süre Etiketi */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                    durationDays > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                    <LuClock size={12} />
                    <span>{durationDays > 0 ? (() => {
                      const d = Math.floor(durationDays / 1440);
                      const h = Math.floor((durationDays % 1440) / 60);
                      const m = durationDays % 60;
                      const p: string[] = [];
                      if (d > 0) p.push(`${d}g`);
                      if (h > 0) p.push(`${h}sa`);
                      if (m > 0) p.push(`${m}dk`);
                      return p.join(' ') || `${durationDays}dk`;
                    })() : t('store_product_permanent')}</span>
                </div>

                {/* Rol Etiketi */}
                {isRoleItem && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[11px] font-bold uppercase">
                        <LuShield size={12} />
                        <span>{t('store_product_role_badge')}</span>
                    </div>
                )}
            </div>

            {/* --- İÇERİK METNİ --- */}
            <div className="space-y-4">
                {/* Rol Bilgisi Kutusu */}
               {(item as any).role_name && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-900/50 border border-white/5 flex gap-4 items-center">
                    <div className="h-10 w-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                        <LuShield size={18} />
                    </div>
                    <div>
                        <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wide mb-0.5">{t('store_product_gained_role')}</div>
                        <div className="text-sm text-white font-medium break-words">{(item as any).role_name}</div>
                    </div>
                  </div>
               )}

               {/* Açıklama */}
               <div className="prose prose-invert prose-sm max-w-none">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{t('store_product_description_title')}</h3>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300 w-full font-light">
                        {item.description || t('store_product_no_description')}
                    </p>
               </div>
            </div>

             {/* Diğer Tagler */}
             {Array.isArray((item as any).tags) && (item as any).tags.length > 0 && (
               <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/5">
                 {((item as any).tags as string[]).map((tag) => (
                   <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 text-zinc-500 text-[10px] border border-zinc-800">
                     <LuTag size={10} /> {tag}
                   </span>
                 ))}
               </div>
            )}
          </div>

          {/* 3. Footer Bar */}
          <div className="flex-shrink-0 p-4 border-t border-white/5 bg-[#0f1116]/80 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">
                 <div className="relative w-10 h-10 flex-shrink-0 drop-shadow-lg">
                    <Image
                        src="/papel.gif"
                        alt="P"
                        fill
                        className="object-contain"
                        unoptimized
                    />
                 </div>
                 <div className="flex flex-col leading-none gap-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t('store_product_total_price')}</span>
                    <span className="text-xl font-bold text-white tracking-tight">{price} <span className="text-sm font-normal text-amber-500">Papel</span></span>
                 </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (addedToCart) return;
                    if (item) onAddToCart(item);
                    setAddedToCart(true);
                    // after 2s close the modal
                    setTimeout(() => {
                      onClose();
                    }, 2000);
                  }}
                  className={`h-11 px-4 rounded-xl text-sm font-medium border border-white/5 transition flex items-center gap-2 ${addedToCart ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
                  type="button"
                  disabled={addedToCart}
                >
                  <LuShoppingCart size={16} className="text-zinc-400 group-hover:text-white transition-colors"/>
                  <span className="hidden sm:inline">{addedToCart ? t('store_added_to_cart') : t('store_add_to_cart')}</span>
                </button>

                <button
                  onClick={() => { onPurchase(item.id); onClose(); }}
                  className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
                >
                  <LuZap size={18} fill="currentColor" className="text-emerald-100" />
                  <span>{t('store_buy_now')}</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
