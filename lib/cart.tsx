"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from './supabaseClient';
import fetchWithCreds from './fetchWithCreds';
import { apiUrl } from './api';
import type { StoreItem, CartItem } from '../app/dashboard/types';

type Coupon = { id: string; code: string; percent: number; minSpend?: number; is_welcome?: boolean; is_special?: boolean; perUserLimit?: number; userUsageCount?: number };

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  addToCart: (item: StoreItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  userCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string, meta?: Partial<Coupon>) => { ok: boolean; message?: string };
  setAppliedCouponData: (c: Coupon | null) => void;
  removeCoupon: () => void;
  refreshCoupons: () => Promise<void>;
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'dw_cart_v1';

const DEFAULT_COUPONS: Coupon[] = [];

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [userCoupons, setUserCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setTimeout(() => {
          setItems(JSON.parse(raw) as CartItem[]);
        }, 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    // load available coupons for the user
    void (async () => {
      try {
        const res = await fetchWithCreds('/api/member/coupons');
        if (!res.ok) return;
        const data = (await res.json()) as Coupon[];
        setUserCoupons(data ?? []);
      } catch {
        setUserCoupons([]);
      }
    })();
  }, []);

  // Subscribe to discount changes (so clients see new/updated discounts without refresh)
  // DISABLED: Realtime connection causing issues in Discord Activity iframe
  
  const refreshCoupons = async () => {
    try {
      const res = await fetchWithCreds('/api/member/coupons');
      if (!res.ok) return;
      const data = (await res.json()) as Coupon[];
      setUserCoupons(data ?? []);
    } catch {
      // ignore
    }
  };

  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Math.round((subtotal * appliedCoupon.percent) / 100 * 100) / 100;
  }, [subtotal, appliedCoupon]);

  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const addToCart = (item: StoreItem) => {
    console.log('CartProvider.addToCart called', item?.id);
    setItems((prev) => {
      const existing = prev.find((p) => p.itemId === item.id);
      if (existing) {
        return prev.map((p) => (p.itemId === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      const newItem: CartItem = { itemId: item.id, title: item.title, price: item.price, qty: 1 };
      console.log('CartProvider.addToCart will add', newItem);
      return [newItem, ...prev];
    });
  };

  const removeFromCart = (itemId: string) => setItems((prev) => prev.filter((p) => p.itemId !== itemId));

  const updateQty = (itemId: string, qty: number) =>
    setItems((prev) => prev.map((p) => (p.itemId === itemId ? { ...p, qty: Math.max(0, Math.floor(qty)) } : p)).filter((p) => p.qty > 0));

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string, meta?: Partial<Coupon>) => {
    const trimmed = code.trim();
    if (!trimmed) return { ok: false, message: 'Kod boş olamaz' };
    const found = userCoupons.find((c) => c.code.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      setAppliedCoupon({ ...found, ...(meta ?? {}) });
      return { ok: true };
    }
    if (meta && meta.id && meta.code) {
      // allow server-provided coupon meta even if not in userCoupons list
      setAppliedCoupon({ id: String(meta.id), code: String(meta.code), percent: Number(meta.percent ?? 0), is_welcome: meta.is_welcome, is_special: meta.is_special, perUserLimit: meta.perUserLimit, userUsageCount: meta.userUsageCount });
      return { ok: true };
    }
    return { ok: false, message: 'Kod bulunamadı' };
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const setAppliedCouponData = (c: Coupon | null) => setAppliedCoupon(c);

  const value: CartContextValue = {
    items,
    subtotal,
    discountAmount,
    total,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    userCoupons,
    appliedCoupon,
    applyCoupon,
    setAppliedCouponData,
    removeCoupon,
    refreshCoupons,
    open,
    openCart: () => setOpen(true),
    closeCart: () => setOpen(false),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartProvider;
