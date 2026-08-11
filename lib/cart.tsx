"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import fetchWithCreds from './fetchWithCreds';
import { apiUrl } from './api';
import type { StoreItem, CartItem } from '../app/dashboard/types';

const t = (key: string, params?: Record<string, string | number>): string => {
  const translations: Record<string, string> = {
    cart_coupon_empty_code: 'Kod boş olamaz',
    cart_coupon_not_found: 'Kod bulunamadı',
    cart_provider_error: 'useCart must be used within CartProvider',
  };

  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      result = result.replace(new RegExp(`{${param}}`, 'g'), String(value));
    });
  }
  return result;
};

type Coupon = {
  id: string;
  code: string;
  percent: number;
  minSpend?: number;
  is_welcome?: boolean;
  is_special?: boolean;
  perUserLimit?: number;
  userUsageCount?: number;
};

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

const LEGACY_STORAGE_KEY = 'dw_cart_v1';
const STORAGE_PREFIX = 'dw_cart_v2:';

function getActiveGuildId(): string | null {
  try {
    const fromLs = window.localStorage.getItem('selectedGuildId');
    if (fromLs) return fromLs;

    const cookieMatch = document.cookie.match(/(?:^|; )selected_guild_id=([^;]+)/);
    if (cookieMatch?.[1]) return decodeURIComponent(cookieMatch[1]);

    return new URL(window.location.href).searchParams.get('guild_id');
  } catch {
    return null;
  }
}

function cartStorageKey(guildId: string) {
  return `${STORAGE_PREFIX}${guildId}`;
}

const DEFAULT_COUPONS: Coupon[] = [];

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [guildId, setGuildId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [userCoupons, setUserCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [open, setOpen] = useState(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    const syncGuild = () => {
      const next = getActiveGuildId();
      setGuildId((prev) => (prev === next ? prev : next));
    };

    syncGuild();
    window.addEventListener('dw:guild-changed', syncGuild);
    window.addEventListener('focus', syncGuild);
    const interval = window.setInterval(syncGuild, 1500);

    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('dw:guild-changed', syncGuild);
      window.removeEventListener('focus', syncGuild);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    skipNextSaveRef.current = true;
    setAppliedCoupon(null);

    if (!guildId) {
      setItems([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(cartStorageKey(guildId));
      setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
    } catch {
      setItems([]);
    }
  }, [guildId]);

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (!guildId) return;
    try {
      window.localStorage.setItem(cartStorageKey(guildId), JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, guildId]);

  const getGuildParam = () => {
    const gid = guildId ?? getActiveGuildId();
    return gid ? `?guild_id=${encodeURIComponent(gid)}` : '';
  };

  useEffect(() => {
    if (!guildId) {
      setUserCoupons([]);
      return;
    }

    void (async () => {
      try {
        const res = await fetchWithCreds(apiUrl(`/api/member/coupons${getGuildParam()}`));
        if (!res.ok) return;
        const data = (await res.json()) as Coupon[];
        setUserCoupons(data ?? []);
      } catch {
        setUserCoupons([]);
      }
    })();
  }, [guildId]);

  const refreshCoupons = async () => {
    try {
      const res = await fetchWithCreds(apiUrl(`/api/member/coupons${getGuildParam()}`));
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
    return Math.round(((subtotal * appliedCoupon.percent) / 100) * 100) / 100;
  }, [subtotal, appliedCoupon]);

  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const addToCart = (item: StoreItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.itemId === item.id);
      if (existing) {
        return prev.map((p) => (p.itemId === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      const newItem: CartItem = { itemId: item.id, title: item.title, price: item.price, qty: 1 };
      return [newItem, ...prev];
    });
  };

  const removeFromCart = (itemId: string) => setItems((prev) => prev.filter((p) => p.itemId !== itemId));

  const updateQty = (itemId: string, qty: number) =>
    setItems((prev) =>
      prev
        .map((p) => (p.itemId === itemId ? { ...p, qty: Math.max(0, Math.floor(qty)) } : p))
        .filter((p) => p.qty > 0),
    );

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const applyCoupon = (code: string, meta?: Partial<Coupon>) => {
    const trimmed = code.trim();
    if (!trimmed) return { ok: false, message: t('cart_coupon_empty_code') };
    const found = userCoupons.find((c) => c.code.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      setAppliedCoupon({ ...found, ...(meta ?? {}) });
      return { ok: true };
    }
    if (meta && meta.id && meta.code) {
      setAppliedCoupon({
        id: String(meta.id),
        code: String(meta.code),
        percent: Number(meta.percent ?? 0),
        is_welcome: meta.is_welcome,
        is_special: meta.is_special,
        perUserLimit: meta.perUserLimit,
        userUsageCount: meta.userUsageCount,
      });
      return { ok: true };
    }
    return { ok: false, message: t('cart_coupon_not_found') };
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
  if (!ctx) throw new Error(t('cart_provider_error'));
  return ctx;
}

export default CartProvider;
