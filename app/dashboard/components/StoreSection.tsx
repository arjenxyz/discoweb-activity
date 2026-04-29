'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PurchaseFeedback, StoreItem } from '../types';
import {
  LuStore, LuClock, LuShield, LuInfo,
  LuSparkles, LuLoader, LuShoppingCart, LuChevronDown, LuChevronUp, LuBadgeCheck
} from 'react-icons/lu';
import Image from 'next/image';
import { useCart } from '../../../lib/cart';
import CartDrawer from '../../../components/CartDrawer';
import { useT } from '@/contexts/LocaleContext';
import ProductDetailModal from './ProductDetailModal';
import { formatDuration } from '../../../lib/formatDuration';

// Background pool for products — from public/store-background
const STORE_BACKGROUNDS = [
  '/store-background/sunger-bob/sunger.gif',
  '/store-background/sunger-bob/sunger2.gif',
  '/store-background/sunger-bob/sunger3.gif',
  '/store-background/sunger-bob/sunger4.gif',
  '/store-background/sunger-bob/sunger5.gif',
  '/store-background/sunger-bob/sunger6.gif',
  '/store-background/sunger-bob/sunger7.gif',
  '/store-background/sunger-bob/sunger8.gif',
  '/store-background/sunger-bob/sunger9.gif',
  '/store-background/invincible/invincible.jpg',
  '/store-background/invincible/invincible2.jpg',
  '/store-background/invincible/invincible3.jpg',
  '/store-background/invincible/invincible4.jpg',
  '/store-background/invincible/invincible5.jpg',
  '/store-background/invincible/invincible6.jpg',
  '/store-background/invincible/invincible7.jpg',
];

type StoreSectionProps = {
  storeLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  items: StoreItem[];
  purchaseLoadingId: string | null;
  purchaseFeedback: PurchaseFeedback;
  onPurchase: (itemId: string) => void;
  onAddToCart: (item: StoreItem) => void;
  renderPapelAmount: (value: number) => React.ReactNode;
  ownedRoleIds?: string[];
};

export default function StoreSection({
  storeLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  items,
  purchaseLoadingId,
  purchaseFeedback,
  onPurchase,
  onAddToCart,
  renderPapelAmount,
  ownedRoleIds = [],
}: StoreSectionProps) {
  const t = useT();
  const cart = useCart();
  const [infoOpen, setInfoOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<StoreItem | null>(null);
  const bgOffset = useState(() => Math.floor(Math.random() * STORE_BACKGROUNDS.length))[0];
  const gifMap = useMemo(() => {
    const m = new Map<string, string | undefined>();
    if (items.length === 0) return m;

    items.forEach((it, idx) => {
      m.set(it.id, STORE_BACKGROUNDS[(bgOffset + idx) % STORE_BACKGROUNDS.length]);
    });

    return m;
  }, [items, bgOffset]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || storeLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    const el = loadMoreRef.current;
    if (!el) return;
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, storeLoading, isLoadingMore, items.length]);

  return (
    <>
      <section className="relative rounded-none border-0 bg-[#0e1018] p-3 sm:p-8 transition-all flex flex-col min-h-full">

        {/* Glow Efektleri */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5865F2]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* --- HEADER --- */}
        <div className="relative z-10 flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src="/icon/shop.png" alt="" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{t('store_title')}</h2>
              <p className="text-[10px] sm:text-[11px] text-white/50 font-medium hidden sm:block">{t('store_subtitle')}</p>
            </div>
          </div>
        {/* Sepet Butonu */}
          <button
            onClick={() => cart?.openCart()}
            className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 group"
          >
            <LuShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />

            <span className="text-xs sm:text-sm font-bold">{t('store_cart_button')}</span>

            {/* Bildirim Balonu (Kırmızı) - toplam adet */}
            {cart?.items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm border-[3px] border-[#0b0d12] px-0.5">
                {cart.items.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </button>
        </div>

        {storeLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/60">
            <LuLoader className="w-10 h-10 animate-spin text-[#5865F2] mb-3" />
            <p className="text-sm font-medium">{t('store_loading')}</p>
          </div>
        ) : (
          <div className="relative z-10 flex-1 flex flex-col">

            {items.length ? (
              <>
                {/* Desktop grid */}
                <div className="hidden sm:grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative isolate flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0d12] p-5 transition-[border-color,box-shadow,transform] duration-300 transform-gpu hover:shadow-[0_8px_30px_rgba(88,101,242,0.2)] hover:border-[#5865F2]/40 hover:scale-[1.02] hover:z-10"
                    >
                      {/* Expand button (small, top-right) */}
                      <button
                        type="button"
                        onClick={() => setExpandedItem(item)}
                        aria-label={t('store_expand_aria')}
                        className="absolute top-3 right-3 z-20 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                      </button>

                      {/* --- ARKA PLAN GIF KATMANI --- */}
                      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[24px]">
                          {/* 1. Siyah Perde (Yazıların okunması için) */}
                          <div className="absolute inset-0 bg-[#0b0d12]/40 group-hover:bg-[#0b0d12]/30 transition-colors duration-500 z-10" />

                          {/* 2. GIF'in Kendisi (daha görünür by default) */}
                            <div className="absolute inset-0 z-0 opacity-60 scale-105 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700 ease-out mix-blend-screen brightness-110">
                              <Image
                                src={gifMap.get(item.id) ?? '/gif/image.gif'}
                                alt="Background Effect"
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                      </div>

                      {/* --- İÇERİK (Z-INDEX ile üste alındı) --- */}
                      <div className="relative z-10">
                        {/* Fiyat & İkon */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg">
                               {renderPapelAmount(item.price)}
                          </div>
                        </div>

                        {/* Başlık */}
                        <h3 className="font-bold text-white text-base leading-tight mb-1 group-hover:text-[#5865F2] transition-colors drop-shadow-md">
                          {item.title}
                        </h3>

                        {/* Açıklama */}
                        <p className="text-xs text-white/60 leading-relaxed line-clamp-2 min-h-[32px] group-hover:text-white/90 transition-colors whitespace-normal break-words max-w-full">
                          {item.description || t('store_no_description')}
                        </p>

                        {/* Etiketler */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border backdrop-blur-sm transition-colors ${
                            (item.duration_days ?? 0) === 0
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            <LuClock className="w-3 h-3" />
                            {formatDuration(item.duration_days ?? 0)}
                          </span>

                          {item.role_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-violet-500/10 text-violet-400 border border-violet-500/20 backdrop-blur-sm">
                              <LuShield className="w-3 h-3" />
                              {t('store_product_role_label')}
                            </span>
                          )}

                          {item.role_id && ownedRoleIds.includes(item.role_id) && (item.duration_days ?? 0) === 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-teal-500/20 text-teal-300 border border-teal-500/30 backdrop-blur-sm">
                              <LuBadgeCheck className="w-3 h-3" />
                              {t('store_owned_badge')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* --- GİZLİ AKSİYON ALANI (SÜRPRİZ EFEKTİ) --- */}
                      {(() => {
                        const isOwned = item.role_id ? ownedRoleIds.includes(item.role_id) && (item.duration_days ?? 0) === 0 : false;
                        if (isOwned) {
                          return (
                            <div className="relative z-10 mt-4">
                              <div className="flex items-center justify-center gap-2 rounded-xl px-4 h-10 text-xs font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20">
                                <LuBadgeCheck className="w-4 h-4" />
                                <span>{t('store_already_owned')}</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className={`relative z-10 grid grid-cols-[auto_1fr] gap-2 mt-4 transition-all duration-300 ease-out overflow-hidden max-h-[60px] ${purchaseLoadingId === item.id || purchaseFeedback[item.id] ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'}`}>
                            {(() => {
                              const cartQty = cart?.items.find(it => it.itemId === item.id)?.qty ?? 0;
                              const isInCart = cartQty > 0;
                              return (
                                <button
                                  type="button"
                                  onClick={() => onAddToCart(item)}
                                  title={isInCart ? t('store_in_cart') : t('store_add_to_cart')}
                                  className={`relative flex items-center justify-center w-10 h-10 rounded-xl border backdrop-blur-md transition-all active:scale-95 ${
                                    isInCart
                                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                      : 'border-white/10 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                                  }`}
                                >
                                  <LuShoppingCart className="w-4 h-4" />
                                  {cartQty > 0 ? (
                                    <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-bold text-black">
                                      {cartQty}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={() => onPurchase(item.id)}
                              disabled={purchaseLoadingId === item.id}
                              className={`flex items-center justify-center gap-2 rounded-xl px-4 h-10 text-xs font-bold text-white transition-all shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 backdrop-blur-md ${
                                purchaseFeedback[item.id]?.status === 'success'
                                  ? 'bg-emerald-500 hover:bg-emerald-400'
                                  : purchaseFeedback[item.id]?.status === 'error'
                                    ? 'bg-rose-500 hover:bg-rose-400'
                                    : 'bg-[#5865F2] hover:bg-[#4752C4]'
                              }`}
                            >
                              {purchaseLoadingId === item.id ? (
                                <LuLoader className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <LuBadgeCheck className="w-4 h-4" />
                                  <span>{purchaseFeedback[item.id]?.message ?? t('store_buy_now')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })()}

                    </div>
                  ))}
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3 flex-1 pb-28">
                  {items.map((item) => {
                    const cartQty = cart?.items.find(it => it.itemId === item.id)?.qty ?? 0;
                    const isInCart = cartQty > 0;
                    const feedback = purchaseFeedback[item.id];
                    const isLoading = purchaseLoadingId === item.id;
                    const isOwned = item.role_id ? ownedRoleIds.includes(item.role_id) && (item.duration_days ?? 0) === 0 : false;
                    return (
                      <div
                        key={item.id}
                        className="relative flex overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12]"
                      >
                        {/* GIF left side */}
                        <div
                          className="relative flex-shrink-0 w-28 min-h-[120px] overflow-hidden"
                          onClick={() => setExpandedItem(item)}
                        >
                          <div className="absolute inset-0 bg-[#0b0d12]/20 z-10" />
                          <Image
                            src={gifMap.get(item.id) ?? '/gif/image.gif'}
                            alt=""
                            fill
                            className="object-cover opacity-80"
                            unoptimized
                          />
                        </div>

                        {/* Right content */}
                        <div className="flex-1 flex flex-col justify-between p-3 min-w-0">
                          <div onClick={() => setExpandedItem(item)}>
                            <h4 className="text-sm font-bold text-white leading-tight truncate">{item.title}</h4>
                            <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5">{item.description || t('store_no_description')}</p>

                            {/* Price + tags row */}
                            <div className="flex items-center gap-2 mt-2">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
                                {renderPapelAmount(item.price)}
                              </div>
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${
                                (item.duration_days ?? 0) === 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                <LuClock className="w-2.5 h-2.5" />
                                {formatDuration(item.duration_days ?? 0)}
                              </span>
                              {item.role_id && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-400">
                                  <LuShield className="w-2.5 h-2.5" />
                                  {t('store_product_role_label')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-2.5">
                            {isOwned ? (
                              <div className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20">
                                <LuBadgeCheck className="w-3.5 h-3.5" />
                                <span>{t('store_product_owned_mobile')}</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onAddToCart(item)}
                                  className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all active:scale-90 ${
                                    isInCart
                                      ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                                      : 'border-white/10 bg-white/5 text-white/50'
                                  }`}
                                >
                                  <LuShoppingCart className="w-3.5 h-3.5" />
                                  {cartQty > 0 ? (
                                    <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-black">
                                      {cartQty}
                                    </span>
                                  ) : null}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onPurchase(item.id)}
                                  disabled={isLoading}
                                  className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11px] font-bold text-white transition-all active:scale-95 disabled:opacity-70 ${
                                    feedback?.status === 'success'
                                      ? 'bg-emerald-500'
                                      : feedback?.status === 'error'
                                        ? 'bg-rose-500'
                                        : 'bg-[#5865F2]'
                                  }`}
                                >
                                  {isLoading ? (
                                    <LuLoader className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <LuBadgeCheck className="w-3.5 h-3.5" />
                                      <span>{feedback?.message ?? t('store_buy_now_mobile')}</span>
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* BOŞ DURUM */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                 <div className="w-24 h-24 mb-3 opacity-60 grayscale">
                    <Image src="/gif/sungorbobcry.gif" alt="Empty" width={96} height={96} className="object-contain" unoptimized />
                 </div>
                 <h3 className="text-base font-bold text-white">{t('store_empty_title')}</h3>
                 <p className="text-white/40 text-xs mt-1">{t('store_empty_subtitle')}</p>
              </div>
            )}

            {hasMore && onLoadMore && (
              <div className="flex items-center justify-center py-4">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-white/60">
                    <LuLoader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{t('store_loading_more')}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    className="text-xs text-white/60 hover:text-white transition"
                  >
                    {t('store_load_more')}
                  </button>
                )}
                <div ref={loadMoreRef} className="h-px w-full" />
              </div>
            )}

            {/* --- KOMPAKT BİLGİLENDİRME (AKORDEON) --- */}
            <div className="mt-5 sm:mt-8 hidden sm:block">
              <button
                onClick={() => setInfoOpen(!infoOpen)}
                className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#5865F2]/20 rounded-lg text-[#5865F2]">
                    <LuInfo className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-[#5865F2] transition-colors">{t('store_info_title')}</p>
                    <p className="text-[10px] text-white/40">{t('store_info_subtitle')}</p>
                  </div>
                </div>
                {infoOpen ? <LuChevronUp className="text-white/40" /> : <LuChevronDown className="text-white/40" />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${infoOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 text-xs text-white/60 space-y-2">
                  <p>• {t('store_info_tip1')}</p>
                  <p>• {t('store_info_tip2')}</p>
                  <p>• {t('store_info_tip3')}</p>
                  <p>• {t('store_info_tip4')}</p>
                  <p>• {t('store_info_tip5')}</p>
                  <p>• {t('store_info_tip6')}</p>
                  <p>• {t('store_info_tip7')}</p>
                  <p>• {t('store_info_tip8')}</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </section>
      <CartDrawer />
      <ProductDetailModal
        item={expandedItem}
        onClose={() => setExpandedItem(null)}
        onAddToCart={onAddToCart}
        onPurchase={(id) => onPurchase(id)}
      />
    </>
  );
}
