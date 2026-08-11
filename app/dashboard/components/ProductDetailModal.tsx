'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoreItem } from '../types';
import { LuClock, LuShield, LuX, LuShoppingCart, LuBadgeCheck, LuCheck } from 'react-icons/lu';
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
  const roleLabel = item.role_name?.trim() || item.title;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/70 p-0 backdrop-blur-xl sm:items-center sm:p-5 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-white/[0.1] bg-[#0b0d12]/96 shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:rounded-[28px] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Hero */}
        <div className="relative h-44 shrink-0 overflow-hidden sm:h-52">
          <Image
            src={heroSrc}
            alt=""
            fill
            className="object-cover opacity-80"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/55 to-black/20" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.1] bg-[#0b0d12]/55 text-white/70 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white"
            aria-label={t('cart_close_aria')}
          >
            <LuX size={18} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-4">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${
                  isPermanent
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                }`}
              >
                <LuClock className="h-3 w-3" />
                {formatDuration(durationDays)}
              </span>
              {isRoleItem && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-[#5865F2]/25 bg-[#5865F2]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#a5b4fc] backdrop-blur-md">
                  <LuShield className="h-3 w-3" />
                  {t('store_product_role_label')}
                </span>
              )}
            </div>
            <h2 className="text-[1.65rem] font-black leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl">
              {item.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {t('store_product_description_title')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/65">
                {item.description || t('store_product_no_description')}
              </p>
            </div>

            {isRoleItem && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/12 text-[#a5b4fc]">
                  <LuShield size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-white/40">
                    {t('store_product_gained_role')}
                  </p>
                  <p className="truncate text-sm font-bold text-white">{roleLabel}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#5865F2]/10 to-transparent px-3.5 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-8 w-8 shrink-0">
                  <Image src="/papel.gif" alt="" fill className="object-contain" unoptimized />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    {t('store_product_total_price')}
                  </p>
                  <p className="text-lg font-black tabular-nums text-white">
                    {price.toLocaleString('tr-TR')}
                    <span className="ml-1.5 text-xs font-semibold text-white/45">Papel</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#0b0d12]/80 px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="grid grid-cols-[auto_1fr] gap-2.5">
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
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition active:scale-95 ${
                addedToCart
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/[0.1] bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white'
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
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] text-sm font-bold text-white shadow-[0_10px_28px_rgba(88,101,242,0.35)] transition hover:bg-[#4752C4] active:scale-[0.98]"
            >
              <LuBadgeCheck size={18} />
              {t('store_buy_now')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
