'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoreItem } from '../types';
import { LuClock, LuShield, LuX, LuShoppingCart, LuZap, LuCheck } from 'react-icons/lu';
import Image from 'next/image';
import { useT } from '@/contexts/LocaleContext';
import { formatDuration } from '@/lib/formatDuration';

export default function ProductDetailModal({
  item,
  visualSrc,
  onClose,
  onAddToCart,
  onPurchase,
}: {
  item: StoreItem | null;
  /** Mağaza kartındaki dekoratif görsel (gifMap) */
  visualSrc?: string | null;
  onClose: () => void;
  onAddToCart: (it: StoreItem) => void;
  onPurchase: (id: string) => void;
}) {
  const t = useT();
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
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

  const heroSrc = item.image_url || visualSrc || '/icon/shop.png';
  const price = item.price ?? 0;
  const durationDays = item.duration_days ?? 0;
  const isRoleItem = !!item.role_id;
  const isPermanent = durationDays === 0;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f1116] shadow-[0_24px_80px_rgba(0,0,0,0.65)] animate-in zoom-in-95 duration-200">
        {/* Hero — mağaza kartı görseli */}
        <div className="relative h-52 shrink-0 overflow-hidden sm:h-64">
          <div className="absolute inset-0 opacity-70 mix-blend-screen brightness-110 sm:opacity-80">
            <Image
              src={heroSrc}
              alt=""
              fill
              className="object-cover scale-105"
              unoptimized
              priority
            />
          </div>
          <div className="absolute inset-0 bg-[#0b0d12]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1116] via-[#0f1116]/50 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 backdrop-blur-md transition hover:bg-black/60 hover:text-white"
            aria-label={t('cart_close_aria')}
          >
            <LuX size={18} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4 pt-10">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide backdrop-blur-sm ${
                  isPermanent
                    ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300'
                    : 'border-amber-500/25 bg-amber-500/15 text-amber-300'
                }`}
              >
                <LuClock className="h-3 w-3" />
                {formatDuration(durationDays)}
              </span>
              {isRoleItem && (
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/25 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-300 backdrop-blur-sm">
                  <LuShield className="h-3 w-3" />
                  {t('store_product_role_label')}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md">
              {item.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-white/35">
                {t('store_product_description_title')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70">
                {item.description || t('store_product_no_description')}
              </p>
            </div>

            {isRoleItem && (
              <div className="flex items-center gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/[0.07] px-3.5 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/15 text-violet-300">
                  <LuShield size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-violet-300/80">
                    {t('store_product_gained_role')}
                  </p>
                  <p className="truncate text-sm font-bold text-white">
                    {(item as StoreItem & { role_name?: string }).role_name || t('store_product_role_label')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#12141c]/95 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="relative h-8 w-8 shrink-0">
              <Image src="/papel.gif" alt="" fill className="object-contain" unoptimized />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-semibold text-white/40">{t('store_product_total_price')}</p>
              <p className="text-xl font-black tabular-nums text-white">
                {price.toLocaleString('tr-TR')}{' '}
                <span className="text-sm font-semibold text-amber-400/90">Papel</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              disabled={addedToCart}
              onClick={(e) => {
                e.stopPropagation();
                if (addedToCart) return;
                onAddToCart(item);
                setAddedToCart(true);
                window.setTimeout(() => onClose(), 1200);
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                addedToCart
                  ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                  : 'border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              aria-label={addedToCart ? t('store_added_to_cart') : t('store_add_to_cart')}
            >
              {addedToCart ? <LuCheck size={20} /> : <LuShoppingCart size={20} />}
            </button>

            <button
              type="button"
              onClick={() => {
                onPurchase(item.id);
                onClose();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-bold text-white shadow-[0_8px_28px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              <LuZap size={18} fill="currentColor" />
              {t('store_buy_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
