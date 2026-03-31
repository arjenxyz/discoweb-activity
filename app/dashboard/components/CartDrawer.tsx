'use client';

import React from 'react';
import { LuX, LuTrash } from 'react-icons/lu';
import type { CartItem } from '../types';
import { useT } from '@/contexts/LocaleContext';

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (itemId: string) => void;
  onChangeQty: (itemId: string, qty: number) => void;
  onApplyDiscountRequest: (itemId: string) => void; // opens discount modal for item
  onCheckout: () => Promise<void>;
  loading?: boolean;
};

export default function CartDrawer({ open, onClose, items, onRemove, onChangeQty, onApplyDiscountRequest, onCheckout, loading }: CartDrawerProps) {
  const t = useT();
  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const discountTotal = items.reduce((s, it) => s + (it.appliedDiscount ? (it.price - it.appliedDiscount.finalPrice) * it.qty : 0), 0);
  const total = subtotal - discountTotal;
  const itemCount = items.reduce((s, it) => s + it.qty, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-stretch">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      {/* Drawer */}
      <aside className="ml-auto w-full max-w-md transform transition-transform duration-200 ease-out translate-x-0 border-l border-white/10 bg-[#08090b] text-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
          <div>
            <h3 className="text-lg font-semibold">{t('cart_title')}</h3>
            <p className="text-xs text-white/60">{t('cart_item_count', { itemCount, productCount: items.length })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // clear cart: remove all
                items.forEach(it => onRemove(it.itemId));
              }}
              className="rounded-md p-2 text-sm text-white/70 hover:bg-white/5"
              aria-label={t('cart_clear_aria')}
              title={t('cart_clear_aria')}
            >
              <LuTrash className="h-4 w-4" />
            </button>
            <button onClick={onClose} aria-label={t('cart_close_aria')} className="rounded-md p-2 text-white/70 hover:bg-white/5">
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-white/60">{t('cart_empty')}</p>
            </div>
          ) : (
            items.map((it) => (
              <div key={it.itemId} className="flex items-start justify-between gap-3 rounded-lg border border-white/6 bg-[#0d0f13] p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-white/60">
                    <span>{it.price.toFixed(2)} {t('cart_price_unit')}</span>
                    {it.appliedDiscount && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">{t('cart_discount_applied', { percent: it.appliedDiscount.percent })}</span>
                    )}
                  </div>
                  {it.appliedDiscount && (
                    <p className="mt-2 text-xs text-emerald-300">{t('cart_discount_code', { code: it.appliedDiscount.code, price: it.appliedDiscount.finalPrice.toFixed(2) })}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => onChangeQty(it.itemId, Math.max(1, it.qty - 1))} className="rounded border border-white/6 px-2 py-1 text-sm">-</button>
                    <div className="px-2 text-sm">{it.qty}</div>
                    <button onClick={() => onChangeQty(it.itemId, it.qty + 1)} className="rounded border border-white/6 px-2 py-1 text-sm">+</button>
                  </div>
                  <div className="text-right text-sm text-white/60">{((it.appliedDiscount ? it.appliedDiscount.finalPrice : it.price) * it.qty).toFixed(2)} {t('cart_price_unit')}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onApplyDiscountRequest(it.itemId)} className="text-xs text-indigo-300 underline">{t('cart_apply_discount')}</button>
                    <button onClick={() => onRemove(it.itemId)} className="text-xs text-rose-300">{t('cart_remove')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sticky bottom-0 w-full border-t border-white/6 bg-gradient-to-t from-[#08090b] to-transparent p-5">
          <div className="mb-3 flex items-center justify-between text-sm text-white/60">
            <span>{t('cart_subtotal')}</span>
            <span>{subtotal.toFixed(2)} {t('cart_price_unit')}</span>
          </div>
          {discountTotal > 0 && (
            <div className="mb-3 flex items-center justify-between text-sm text-rose-300">
              <span>{t('cart_discount')}</span>
              <span>-{discountTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between text-lg font-semibold">
            <span>{t('cart_total')}</span>
            <span>{total.toFixed(2)} {t('cart_price_unit')}</span>
          </div>

          <button onClick={onCheckout} disabled={loading || items.length === 0} className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? t('cart_checking_out') : t('cart_checkout')}
          </button>
        </div>
      </aside>
    </div>
  );
}
