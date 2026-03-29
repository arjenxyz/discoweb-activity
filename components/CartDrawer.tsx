"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LuX, LuTrash2, LuPlus, LuMinus, LuChevronLeft,
  LuTicket, LuCircleCheck, LuChevronDown, LuChevronUp, LuLock, LuEye, LuEyeOff,
} from 'react-icons/lu';
import Image from 'next/image';
import { useCart } from '../lib/cart';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useT } from '@/contexts/LocaleContext';

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;


type Coupon = {
  id: string | number;
  code: string;
  percent?: number;
  minSpend?: number;
  min_spend?: number;
  perUserLimit?: number;
  userUsageCount?: number;
  is_welcome?: boolean;
  is_special?: boolean;
  [key: string]: unknown;
};

export default function CartDrawer() {
  const t = useT();
  const {
    items, subtotal, discountAmount, total,
    updateQty, removeFromCart, clearCart,
    appliedCoupon, applyCoupon, removeCoupon,
    userCoupons,
    open, closeCart,
    refreshCoupons,
  } = useCart();

  const [drawerWidth, setDrawerWidth] = useState(420);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = drawerWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, [drawerWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setDrawerWidth(newWidth);
    };
    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [showCouponList, setShowCouponList] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [checkoutErrorType, setCheckoutErrorType] = useState<'insufficient_balance' | 'other' | null>(null);

  // --- LİMİT VE KISITLAMA MANTIĞI ---
  // Kupon objesinden limit bilgisini çekiyoruz (Veritabanından snake_case gelebilir diye kontrol ediyoruz)
  const currentMinSpend = appliedCoupon
    ? Number(
        (appliedCoupon as Coupon).minSpend ||
        (appliedCoupon as Coupon).min_spend ||
        0
      )
    : 0;

  // Sepet tutarı limitin altında mı?
  const isBelowLimit = currentMinSpend > 0 && subtotal < currentMinSpend;

  // Kalan tutar hesaplama
  const remainingAmount = Math.max(currentMinSpend - subtotal, 0);

  // Progress Bar Yüzdesi
  const progressPercent = currentMinSpend > 0 ? Math.min((subtotal / currentMinSpend) * 100, 100) : 100;

  // Checkout Butonu Aktiflik Durumu (Sepet boşsa, limit yetersizse veya işlem sürüyorsa kilitli)
  const isCheckoutDisabled = items.length === 0 || isBelowLimit || checkoutLoading;

  // Hoşgeldin ve Özel Kuponları Filtrele
  const welcomeCoupon = Array.isArray(userCoupons) ? userCoupons.find((c: Coupon) => c.is_welcome) : undefined;
  const specialCoupons = Array.isArray(userCoupons) ? userCoupons.filter((c: Coupon) => c.is_special) : [];

  // Kupon uygulandıktan sonra kullanım bilgisini göster
  // NOT: Kupon limiti dolana kadar (userUsageCount >= perUserLimit) listede kalır
  // Limit tam dolduğunda backend /api/member/coupons listeden kaldırır

  // Sepet açıldığında kuponları yenile — CartProvider mount olduğunda guild_id
  // henüz localStorage'da olmayabilir, bu yüzden ilk fetch boş döner.
  useEffect(() => {
    if (open) {
      void refreshCoupons();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  // --- KUPON UYGULAMA ---
  const handleApply = async (couponCode: string) => {
    setApplying(true);
    setMessage(null);

    setTimeout(async () => {
      if (items.length === 0) {
        setMessage({ text: t('checkout_no_items_error'), type: 'error' });
        setApplying(false);
        return;
      }

      // Backend doğrulaması
      try {
        const resp = await fetchWithCreds('/api/discount/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: couponCode, itemId: items[0].itemId, cartTotal: subtotal }),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || data?.error) {
           // Hata yönetimi
           if (data?.error === 'MIN_SPEND_NOT_MET') {
             setMessage({ text: t('coupon_min_spend_error', { remaining: data.remaining }), type: 'error' });
           } else if (data?.error === 'ALREADY_USED') {
             setMessage({ text: t('coupon_already_used_error'), type: 'error' });
           } else if (data?.error === 'wrong_server') {
             setMessage({ text: t('discount_error_wrong_server'), type: 'error' });
           } else if (data?.error === 'expired') {
             setMessage({ text: t('discount_error_expired'), type: 'error' });
           } else if (data?.error === 'usage_limit_exceeded') {
             setMessage({ text: t('discount_error_usage_limit'), type: 'error' });
           } else {
             setMessage({ text: t('coupon_invalid_error'), type: 'error' });
           }
           // Eğer yerelde uygulandıysa geri al
           removeCoupon();
           setApplying(false);
           return;
        }

        // Başarılı ise context'e uygula
        // Backend'den dönen veriyi, context'in beklediği yapıya çevirip yolluyoruz
        // Böylece minSpend gibi detaylar state'e işleniyor.
        const res = applyCoupon(couponCode, data.discount);

        if (res.ok) {
            setMessage({ text: t('coupon_applied_success'), type: 'success' });
            setCode('');
        } else {
            setMessage({ text: res.message || t('coupon_invalid_error'), type: 'error' });
        }

      } catch (err) {
        console.error(err);
        setMessage({ text: t('checkout_error_generic'), type: 'error' });
      }

      setApplying(false);
    }, 600);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setMessage(null);
  };

  // --- ÖDEME ---
  const handleCheckout = async () => {
    if (isCheckoutDisabled) return;

    setCheckoutLoading(true);
    setCheckoutError(false);
    setCheckoutErrorType(null);
    try {
      const payload = {
        items: items.map(it => ({ itemId: it.itemId, qty: it.qty })),
        appliedCoupon: appliedCoupon ? { id: appliedCoupon.id } : undefined,
      };

      const response = await fetchWithCreds('/api/member/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        // Backend tarafındaki limit kontrolü (Güvenlik için çift kontrol)
        if (data.error === 'MIN_SPEND_NOT_MET') {
            setMessage({ text: t('coupon_min_spend_error', { remaining: data.remaining }), type: 'error' });
            setCheckoutErrorType('other');
        } else if (data.error === 'insufficient_balance') {
            setMessage({ text: t('checkout_insufficient_balance_detail', { missing: String(data.required - data.available) }), type: 'error' });
            setCheckoutErrorType('insufficient_balance');
        } else {
            setMessage({ text: data.error || t('checkout_error_generic'), type: 'error' });
            setCheckoutErrorType('other');
        }
        setCheckoutError(true);
        setCheckoutLoading(false);
        // 5 saniye sonra hata durumunu resetle
        setTimeout(() => {
          setCheckoutError(false);
          setCheckoutErrorType(null);
        }, 5000);
        return;
      }

      // Başarılı
      setCheckoutSuccess(true);
      setMessage(null);

      // Kuponları yenile ve diğer bileşenleri uyar
      if(refreshCoupons) await refreshCoupons();
      try { window.dispatchEvent(new CustomEvent('mail:refresh')); } catch {}

      setTimeout(() => {
        clearCart();
        closeCart();
        setCheckoutSuccess(false);
        setCheckoutError(false);
        setCheckoutErrorType(null);
        setCheckoutLoading(false);
      }, 1500);

    } catch (e) {
      console.error(e);
      setMessage({ text: t('checkout_error_generic'), type: 'error' });
      setCheckoutError(true);
      setCheckoutErrorType('other');
      setCheckoutLoading(false);
      // 5 saniye sonra hata durumunu resetle
      setTimeout(() => {
        setCheckoutError(false);
        setCheckoutErrorType(null);
      }, 5000);
    }
  };

  const getCheckoutButtonLabel = () => {
    if (checkoutLoading) return t('checkout_button_processing');
    if (checkoutSuccess) return t('checkout_button_success');
    if (checkoutError) {
      if (checkoutErrorType === 'insufficient_balance') return t('checkout_button_insufficient_balance');
      return t('checkout_button_failed');
    }
    if (isBelowLimit) return t('checkout_button_limit_insufficient');
    return t('checkout_button_default');
  };

  const VIDEOS = ['/cdn/Storage/test.mp4', '/cdn/Storage/Test1.mp4'];
  const [videoSrc] = useState(() => VIDEOS[Math.floor(Math.random() * VIDEOS.length)]);
  const [muted, setMuted] = useState(true);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end font-sans">
      {/* Backdrop — video + overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" onClick={closeCart}>
        {/* Video alanı */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ right: drawerWidth }}
          onClick={e => e.stopPropagation()}
        >
          {/* Video */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${spoilerRevealed ? 'blur-0' : 'blur-2xl scale-110'}`}
          />

          {/* Karartma gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/60 pointer-events-none" />

          {/* Spoiler overlay */}
          {!spoilerRevealed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                <svg className="w-7 h-7 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              </div>
              <p className="text-white/60 text-sm font-semibold">Spoiler</p>
              <button
                onClick={() => setSpoilerRevealed(true)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all backdrop-blur-md"
              >
                Göster
              </button>
            </div>
          )}

          {/* Butonlar */}
          {spoilerRevealed && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
              {/* Mute butonu */}
              <button
                onClick={() => setMuted(m => !m)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-white/70 hover:text-white transition-all backdrop-blur-md"
                aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}
              >
                {muted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z"/>
                    <line x1="18" y1="9" x2="23" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="23" y1="9" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 3.586L7.707 8.879A1 1 0 017 9H4a1 1 0 00-1 1v4a1 1 0 001 1h3a1 1 0 01.707.293L13 20.414V3.586z"/>
                    <path d="M17.5 7.5a7 7 0 010 9M20 5a10 10 0 010 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                )}
              </button>
              {/* Spoiler gizle */}
              <button
                onClick={() => { setSpoilerRevealed(false); setMuted(true); }}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-white/70 hover:text-white transition-all backdrop-blur-md"
                aria-label="Gizle"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="relative h-full bg-[#0b0d12]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col"
        style={{ width: drawerWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 group"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full bg-white/10 group-hover:bg-[#5865F2]/60 transition-colors" />
        </div>

        {/* Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#5865F2]/20 rounded-full blur-[60px] pointer-events-none" />

        {/* --- HEADER --- */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={closeCart}
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-xl bg-white/8 text-white/70 hover:text-white hover:bg-white/15 transition-all"
              aria-label="Geri"
            >
              <LuChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-bold text-lg">{t('cart_drawer_title')}</span>
            <span className="bg-white/10 text-white/60 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {t('cart_drawer_count', { count: items.reduce((s, i) => s + i.qty, 0), items: items.length })}
            </span>
          </div>
          <button onClick={closeCart} className="text-white/50 hover:text-white transition-colors" aria-label={t('cart_drawer_close_aria')}>
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* --- CONTENT --- */}
        <div className="relative z-10 flex-1 overflow-y-auto p-4 no-scrollbar pb-40">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn">
              <div className="relative w-32 h-32 opacity-60 grayscale hover:grayscale-0 transition-all">
                <Image src="/gif/cat.gif" alt="empty" fill className="object-contain" unoptimized />
              </div>
              <p className="text-white/40 text-sm">{t('cart_drawer_empty')}</p>
              <button onClick={closeCart} className="text-[#5865F2] text-sm font-bold hover:underline">
                {t('cart_continue_shopping')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.itemId} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 hover:border-[#5865F2]/30 transition-all">
                  <div className="w-12 h-12 rounded-lg bg-[#5865F2]/10 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                     {/* Ürün Görseli Yer Tutucu */}
                     <Image
                       src="/gif/cat.gif"
                       alt="Item"
                       fill
                       className="object-cover opacity-80"
                       unoptimized
                     />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-sm truncate">{it.title}</div>
                    <div className="text-xs text-white/40 mt-0.5">{it.price} {t('cart_papel_unit')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/5 h-8">
                      <button onClick={() => updateQty(it.itemId, it.qty - 1)} className="w-7 h-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-30" disabled={it.qty <= 1}>
                        <LuMinus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">{it.qty}</span>
                      <button onClick={() => updateQty(it.itemId, it.qty + 1)} className="w-7 h-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                        <LuPlus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(it.itemId)} className="text-white/20 hover:text-rose-400 transition-colors" aria-label={t('cart_drawer_remove')}>
                        <LuTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- FOOTER --- */}
        {items.length > 0 && (
          <div className="sticky bottom-0 z-20 bg-[#0b0d12] border-t border-white/10">

            {/* --- LİMİT BAR (Sadece Kupon Varsa ve Limit Varsa) --- */}
            {appliedCoupon && currentMinSpend > 0 && (
               <div className="relative w-full h-1 bg-white/10">
                  <div
                    className={`h-full transition-all duration-700 ${isBelowLimit ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                  {isBelowLimit && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 animate-pulse backdrop-blur-md">
                       <LuLock className="w-3 h-3" /> {t('checkout_progress_text', { remaining: remainingAmount.toFixed(0) })}
                    </div>
                  )}
               </div>
            )}

            <div className="p-5 space-y-4">

              {/* KUPON ALANI (Akordeon) */}
              <div>
                {!appliedCoupon ? (
                  <div className="border-b border-white/5 pb-2">
                    {/* Başlık + göz ikonu */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[#5865F2]">
                        <LuTicket className="w-3.5 h-3.5" /> {t('cart_drawer_discount_code')}
                      </span>
                      <button
                        onClick={() => setShowCouponList(prev => !prev)}
                        className="text-white/40 hover:text-white transition-colors"
                        aria-label={showCouponList ? t('coupon_toggle_list_close') : t('coupon_toggle_list_open')}
                      >
                        {showCouponList ? <LuEye className="w-3.5 h-3.5" /> : <LuEyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Kod girişi + buton */}
                    {showCouponList && (
                      <>
                        <div className="flex gap-2">
                          <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && code && handleApply(code)}
                            placeholder={t('coupon_input_placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#5865F2] outline-none placeholder:text-white/25"
                          />
                          <button
                            onClick={() => handleApply(code)}
                            disabled={applying || !code}
                            className="px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                          >
                            {applying ? '...' : t('cart_drawer_apply_discount')}
                          </button>
                        </div>
                        {message && <p className={`text-[10px] mt-1.5 ${message.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{message.text}</p>}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <LuCircleCheck className="text-emerald-400 w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold text-emerald-400">{appliedCoupon.code}</p>
                        <div className="text-[9px] text-white/40 space-y-0.5">
                          {currentMinSpend > 0 && <p>Min. {currentMinSpend} {t('cart_papel_unit')}</p>}
                          <p>
                            {t('cart_coupon_usage_label')}: {
                              (() => {
                                const coupon = appliedCoupon as Coupon | undefined;
                                const usage = Number(coupon?.userUsageCount ?? coupon?.used_count ?? 0);
                                let limit: string | number = '∞';
                                if (typeof coupon?.perUserLimit === 'number' && coupon.perUserLimit > 0) {
                                  limit = coupon.perUserLimit;
                                } else if (typeof coupon?.max_uses === 'number' && coupon.max_uses > 0) {
                                  limit = coupon.max_uses;
                                }
                                return `${usage} / ${limit}`;
                              })()
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-[10px] text-white/50 hover:text-white underline">{t('cart_drawer_remove')}</button>
                  </div>
                )}

                {/* Kupon chip'leri — yatay kaydırılabilir */}
                {showCouponList && !appliedCoupon && (welcomeCoupon || specialCoupons.length > 0) && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {/* Hoşgeldin kuponu */}
                    {welcomeCoupon && (() => {
                      const wUsage = (welcomeCoupon as Coupon).userUsageCount ?? 0;
                      const wLimit = (welcomeCoupon as Coupon).perUserLimit ?? 1;
                      return (
                        <button
                          key="welcome"
                          onClick={() => handleApply((welcomeCoupon as Coupon).code)}
                          disabled={applying}
                          className="flex-shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all disabled:opacity-50 text-left"
                        >
                          <span className="text-[11px] font-bold text-indigo-300">🎁 {t('cart_welcome_coupon_title')}</span>
                          <span className="text-[10px] text-indigo-300/60">
                            %{welcomeCoupon.percent} indirim
                            {wLimit > 1 && <span className="ml-1 opacity-60">• {wUsage}/{wLimit}</span>}
                          </span>
                        </button>
                      );
                    })()}

                    {/* Özel kuponlar */}
                    {specialCoupons.map((coupon) => {
                      const userUsageCount = (coupon as Coupon).userUsageCount ?? 0;
                      const perUserLimit = (coupon as Coupon).perUserLimit ?? 1;
                      return (
                        <button
                          key={coupon.id}
                          onClick={() => handleApply(coupon.code)}
                          disabled={applying}
                          className="flex-shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all disabled:opacity-50 text-left"
                        >
                          <span className="text-[11px] font-bold text-emerald-300">{coupon.code}</span>
                          <span className="text-[10px] text-emerald-300/60">
                            %{coupon.percent} indirim
                            {perUserLimit > 1 && <span className="ml-1 opacity-60">• {userUsageCount}/{perUserLimit}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FİYAT & BUTON */}
              <div className="flex items-end justify-between gap-4">
                 {/* Mobil geri butonu */}
                 <button
                   onClick={closeCart}
                   className="sm:hidden flex items-center justify-center h-12 w-12 rounded-xl bg-white/8 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all flex-shrink-0"
                   aria-label="Geri"
                 >
                   <LuChevronLeft className="w-5 h-5" />
                 </button>

                 <div>
                    <p className="text-xs text-white/50 mb-0.5">{t('cart_drawer_total')}</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-bold text-white">{total.toFixed(2)}</span>
                       <span className="text-sm font-medium text-white/50">{t('cart_papel_unit')}</span>
                    </div>
                    {discountAmount > 0 && <p className="text-[10px] text-emerald-400">{t('discount_applied_label', { discount: String(discountAmount) })}</p>}
                 </div>

                 {/* ÖDEME BUTONU */}
                 <button
                    disabled={isCheckoutDisabled}
                    onClick={handleCheckout}
                    className={`flex-1 max-w-[180px] h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm text-white shadow-lg transition-all active:scale-95 ${
                        isCheckoutDisabled
                            ? 'bg-white/5 cursor-not-allowed opacity-50 border border-white/5 text-white/40'
                            : checkoutSuccess
                                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                                : checkoutError
                                    ? 'bg-red-500 hover:bg-red-400 shadow-red-500/25'
                                    : 'bg-gradient-to-r from-[#5865F2] to-indigo-600 hover:brightness-110 shadow-[#5865F2]/25'
                    }`}
                >
                    {getCheckoutButtonLabel()}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes float-0 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes float-1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }
        @keyframes float-2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}
