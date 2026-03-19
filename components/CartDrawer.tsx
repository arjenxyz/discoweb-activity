"use client";

import React, { useState, useEffect } from 'react';
import {
  LuX, LuTrash2, LuPlus, LuMinus,
  LuTicket, LuCircleCheck, LuChevronDown, LuChevronUp, LuLock, LuEye, LuEyeOff
} from 'react-icons/lu';
import Image from 'next/image';
import { useCart } from '../lib/cart';
import fetchWithCreds from '@/lib/fetchWithCreds';


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
  const { 
    items, subtotal, discountAmount, total, 
    updateQty, removeFromCart, clearCart,
    appliedCoupon, applyCoupon, removeCoupon,
    userCoupons,
    open, closeCart,
    refreshCoupons,
  } = useCart();

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [showCouponInput, setShowCouponInput] = useState(false);
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

  // Eğer sepette ürün ekleme/çıkarma yapıldıysa kupon girişini kapat (kullanıcı gizlediyse açılmasın)
  useEffect(() => {
    if (showCouponInput) {
      // Use setTimeout to avoid synchronous state updates that can trigger cascading renders
      const timer = setTimeout(() => {
        setShowCouponInput(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [items.length, showCouponInput]);

  if (!open) return null;

  // --- KUPON UYGULAMA ---
  const handleApply = async (couponCode: string) => {
    setApplying(true);
    setMessage(null);
    
    setTimeout(async () => {
      if (items.length === 0) {
        setMessage({ text: 'Sepette ürün yok', type: 'error' });
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
             setMessage({ text: `${data.remaining} Papel daha ekle`, type: 'error' });
           } else if (data?.error === 'ALREADY_USED') {
             setMessage({ text: 'Bu kodu zaten kullandınız', type: 'error' });
           } else {
             setMessage({ text: data?.error || 'Kod geçersiz', type: 'error' });
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
            setMessage({ text: 'Kupon aktif!', type: 'success' });
            setCode('');
            setShowCouponInput(false);
        } else {
            setMessage({ text: res.message || 'Hata', type: 'error' });
        }

      } catch (err) {
        console.error(err);
        setMessage({ text: 'Bağlantı hatası', type: 'error' });
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
            setMessage({ text: `Sepet limiti için ${data.remaining} Papel daha gerekli`, type: 'error' });
            setCheckoutErrorType('other');
        } else if (data.error === 'insufficient_balance') {
            setMessage({ text: `Yetersiz bakiye! (Eksik: ${data.required - data.available})`, type: 'error' });
            setCheckoutErrorType('insufficient_balance');
        } else {
            setMessage({ text: data.error || 'Ödeme başarısız', type: 'error' });
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
      setMessage({ text: 'Hata oluştu', type: 'error' });
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

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end font-sans">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px] transition-all duration-300" 
        onClick={closeCart} 
      >
        {/* Sol taraftaki büyük GIF Efekti */}
        <div className="absolute inset-0 flex items-center justify-start pl-72 pointer-events-none">
           <Image 
             src="/gif/image.gif" 
             alt="Effect" 
             fill 
             className="object-contain opacity-100" 
             unoptimized 
           />
        </div>
      </div>

      <div className="relative w-full max-w-[420px] h-full bg-[#0b0d12]/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#5865F2]/20 rounded-full blur-[60px] pointer-events-none" />

        {/* --- HEADER --- */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg">Sepetim</span>
            <span className="bg-white/10 text-white/60 text-[10px] px-2 py-0.5 rounded-full font-medium">
              {items.length} Ürün
            </span>
          </div>
          <button onClick={closeCart} className="text-white/50 hover:text-white transition-colors">
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
              <p className="text-white/40 text-sm">Sepetin şimdilik boş duruyor.</p>
              <button onClick={closeCart} className="text-[#5865F2] text-sm font-bold hover:underline">
                Alışverişe Dön
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
                    <div className="text-xs text-white/40 mt-0.5">{it.price} Papel</div>
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
                    <button onClick={() => removeFromCart(it.itemId)} className="text-white/20 hover:text-rose-400 transition-colors">
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
                       <LuLock className="w-3 h-3" /> Kupon için {remainingAmount.toFixed(0)} Papel daha gerekli
                    </div>
                  )}
               </div>
            )}

            <div className="p-5 space-y-4">
              
              {/* KUPON ALANI (Akordeon) */}
              <div>
                {!appliedCoupon ? (
                  <div className="border-b border-white/5 pb-2">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowCouponInput(!showCouponInput)}
                        className="flex items-center gap-2 text-xs font-bold text-[#5865F2] hover:text-white transition-colors select-none"
                      >
                        <LuTicket /> İndirim Kodu Kullan {showCouponInput ? <LuChevronUp /> : <LuChevronDown />}
                      </button>

                      <div className="flex-1" />

                      <button
                        onClick={() => setShowCouponList(prev => !prev)}
                        className="text-white/50 hover:text-white p-2 rounded-md transition-colors"
                        aria-label={showCouponList ? 'Kuponları kapat' : 'Kuponları aç'}
                        title={showCouponList ? 'Kuponları kapat' : 'Kuponları aç'}
                      >
                        {showCouponList ? <LuEye className="w-4 h-4" /> : <LuEyeOff className="w-4 h-4" />}
                      </button>
                    </div>

                    {showCouponInput && showCouponList && (
                      <div className="mt-3 space-y-2 animate-fadeIn">
                        <div className="flex gap-2">
                          <input 
                            value={code} 
                            onChange={(e) => setCode(e.target.value)} 
                            placeholder="Kodu giriniz" 
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5865F2] outline-none" 
                          />
                          <button 
                            onClick={() => handleApply(code)} 
                            disabled={applying || !code}
                            className="px-3 bg-white/10 hover:bg-[#5865F2] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>
                    )}
                     {message && <p className={`text-[10px] mt-1 ${message.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>{message.text}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <LuCircleCheck className="text-emerald-400 w-4 h-4" />
                      <div>
                        <p className="text-xs font-bold text-emerald-400">{appliedCoupon.code}</p>
                        <div className="text-[9px] text-white/40 space-y-0.5">
                          {currentMinSpend > 0 && <p>Min. {currentMinSpend} Papel</p>}
                          <p>
                            Kullanım: {Number((appliedCoupon as Coupon).userUsageCount ?? (appliedCoupon as Coupon).used_count ?? 0)} / {typeof (appliedCoupon as Coupon).perUserLimit === 'number' && (appliedCoupon as Coupon).perUserLimit > 0
                              ? (appliedCoupon as Coupon).perUserLimit
                              : (typeof (appliedCoupon as Coupon).max_uses === 'number' && (appliedCoupon as Coupon).max_uses > 0
                                ? (appliedCoupon as Coupon).max_uses
                                : '∞')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-[10px] text-white/50 hover:text-white underline">Kaldır</button>
                  </div>
                )}

                {showCouponList && (
                  <>
                    {/* Hoşgeldin Kuponu */}
                    {welcomeCoupon && !appliedCoupon && (() => {
                      const wUsage = (welcomeCoupon as Coupon).userUsageCount ?? 0;
                      const wLimit = (welcomeCoupon as Coupon).perUserLimit ?? 1;
                      return (
                        <div className="mt-3 p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-indigo-300">Hoşgeldin İndirimi</p>
                              <p className="text-[10px] text-white/60">
                                {welcomeCoupon.percent}% indirim
                                {wLimit > 1 && <span className="ml-1.5 text-white/40">• {wUsage}/{wLimit} kullanıldı</span>}
                              </p>
                            </div>
                            <button onClick={() => handleApply((welcomeCoupon as Coupon).code)} disabled={applying} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg transition-colors">
                              Kullan
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Özel Kuponlar (kaydırılabilir) */}
                    {!appliedCoupon && specialCoupons.length > 0 && (
                      <div className="mt-3 max-h-44 overflow-y-auto space-y-2 pr-2">
                        {specialCoupons.map((coupon) => {
                          const userUsageCount = (coupon as Coupon).userUsageCount ?? 0;
                          const perUserLimit = (coupon as Coupon).perUserLimit ?? 1;
                          return (
                            <div key={coupon.id} className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-emerald-300">{coupon.code}</p>
                                  <p className="text-[10px] text-white/60">
                                    {coupon.percent}% indirim
                                    {perUserLimit > 1 && <span className="ml-1.5 text-white/40">• {userUsageCount}/{perUserLimit} kullanıldı</span>}
                                  </p>
                                </div>
                                <button onClick={() => handleApply(coupon.code)} disabled={applying} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors">
                                  Kullan
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* FİYAT & BUTON */}
              <div className="flex items-end justify-between gap-4">
                 <div>
                    <p className="text-xs text-white/50 mb-0.5">Toplam Tutar</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-bold text-white">{total.toFixed(2)}</span>
                       <span className="text-sm font-medium text-white/50">Papel</span>
                    </div>
                    {discountAmount > 0 && <p className="text-[10px] text-emerald-400">-{discountAmount} Papel İndirim</p>}
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
                    {checkoutLoading ? 'İşleniyor...' : checkoutSuccess ? 'Başarılı' : checkoutError ? (checkoutErrorType === 'insufficient_balance' ? 'Yetersiz Bakiye' : 'İşlem Tamamlanamadı') : isBelowLimit ? 'Limit Yetersiz' : 'Ödemeyi Tamamla'}
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
      `}</style>
    </div>
  );
}