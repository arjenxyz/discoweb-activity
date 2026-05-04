'use client';

import Image from 'next/image';
import { LuShoppingCart, LuArrowRight } from 'react-icons/lu';
import { useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useCart } from '../../../lib/cart';
import type { StoreItem } from '../types';

const STORE_BACKGROUNDS = [
  '/store-background/sunger-bob/sunger.gif',
  '/store-background/sunger-bob/sunger2.gif',
  '/store-background/sunger-bob/sunger3.gif',
  '/store-background/invincible/invincible.jpg',
  '/store-background/invincible/invincible2.jpg',
];

function formatPrice(price: number) {
  return `TRY ${price.toFixed(2)}`;
}

function ShopCard({
  item,
  cartQty,
  onAddToCart,
  onPurchase,
  purchaseLoading,
  purchaseMessage,
  gifUrl,
}: {
  item: StoreItem;
  cartQty: number;
  onAddToCart: (item: StoreItem) => void;
  onPurchase: (itemId: string) => Promise<void>;
  purchaseLoading: boolean;
  purchaseMessage?: string;
  gifUrl: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#080a12] shadow-2xl shadow-black/30 transition hover:-translate-y-1 hover:border-white/20">
      <div className="absolute inset-0 overflow-hidden rounded-[32px]">
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 opacity-60 group-hover:opacity-90 transition-all duration-700 scale-105 group-hover:scale-110">
          <Image src={gifUrl} alt="Product background" fill className="object-cover" unoptimized />
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
            Papel {formatPrice(item.price)}
          </div>
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
          >
            <LuShoppingCart className="h-4 w-4" />
            {cartQty > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {cartQty}
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-4 flex-1">
          <h3 className="text-base font-black tracking-tight text-white sm:text-lg">{item.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300 line-clamp-3">{item.description || 'No description available.'}</p>
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => onPurchase(item.id)}
            disabled={purchaseLoading}
            className="inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-full bg-[#5865F2] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:bg-white/10"
          >
            {purchaseLoading ? 'Satını Alınıyor...' : 'Hemen Satın Al'}
            <LuArrowRight className="h-4 w-4" />
          </button>
        </div>

        {purchaseMessage ? (
          <div className="mt-4 rounded-3xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-slate-200">
            {purchaseMessage}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StoreGrid() {
  const cart = useCart();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [purchaseMessageMap, setPurchaseMessageMap] = useState<Record<string, string>>({});
  const [bgOffset] = useState(() => Math.floor(Math.random() * STORE_BACKGROUNDS.length));

  const gifMap = useMemo(
    () => new Map(items.map((item, idx) => [item.id, STORE_BACKGROUNDS[(bgOffset + idx) % STORE_BACKGROUNDS.length]])),
    [bgOffset, items],
  );

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

  const handlePurchase = async (itemId: string) => {
    setPurchaseLoadingId(itemId);
    setPurchaseMessageMap((prev) => ({ ...prev, [itemId]: '' }));

    try {
      const response = await fetchWithCreds('/api/member/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ itemId, qty: 1 }] }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.error) {
        const message = data?.error || 'Satın alma başarısız oldu.';
        setPurchaseMessageMap((prev) => ({ ...prev, [itemId]: message }));
      } else {
        setPurchaseMessageMap((prev) => ({ ...prev, [itemId]: 'Satın alma işlemi başarılı.' }));
        cart.openCart();
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      setPurchaseMessageMap((prev) => ({ ...prev, [itemId]: 'Satın alma sırasında hata oluştu.' }));
    } finally {
      setPurchaseLoadingId(null);
    }
  };

  const handleAddToCart = (item: StoreItem) => {
    cart.addToCart(item);
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Duyuru Ürünleri</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Mağazanızdaki ürünleri burada da görüntüleyin, sepete ekleyin ve satın alın.</p>
        </div>
        <button
          type="button"
          onClick={() => cart.openCart()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          <LuShoppingCart className="h-4 w-4" />
          Sepeti Aç ({cart.items.reduce((sum, item) => sum + item.qty, 0)})
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[32px] border border-white/10 bg-white/5"
              />
            ))
          : items.length > 0
          ? items.map((item) => (
              <ShopCard
                key={item.id}
                item={item}
                cartQty={cart.items.find((it) => it.itemId === item.id)?.qty ?? 0}
                onAddToCart={handleAddToCart}
                onPurchase={handlePurchase}
                purchaseLoading={purchaseLoadingId === item.id}
                purchaseMessage={purchaseMessageMap[item.id]}
                gifUrl={gifMap.get(item.id) ?? STORE_BACKGROUNDS[0]}
              />
            ))
          : (
              <div className="md:col-span-4 rounded-[24px] border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-300">
                Mağazada aktif ürün bulunamadı.
              </div>
            )}
      </div>
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
        <StoreGrid />
      </div>
    </div>
  );
}
