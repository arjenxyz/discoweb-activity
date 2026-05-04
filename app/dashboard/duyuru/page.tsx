'use client';

import Image from 'next/image';
import { LuShoppingCart, LuStore } from 'react-icons/lu';
import { useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useCart } from '../../../lib/cart';
import ProductDetailModal from '../components/ProductDetailModal';
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
  onOpenDetails,
  onAddToCart,
  onPurchase,
  purchaseLoading,
  purchaseMessage,
  gifUrl,
}: {
  item: StoreItem;
  cartQty: number;
  onOpenDetails: (item: StoreItem) => void;
  onAddToCart: (item: StoreItem) => void;
  onPurchase: (itemId: string) => Promise<void>;
  purchaseLoading: boolean;
  purchaseMessage?: string;
  gifUrl: string;
}) {
  return (
    <article
      onClick={() => onOpenDetails(item)}
      className="group relative cursor-pointer overflow-hidden rounded-[32px] border border-white/10 bg-[#11151f] shadow-[0_20px_80px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className="relative h-56 overflow-hidden rounded-t-[32px] bg-slate-950">
        <Image src={gifUrl} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-105" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-transparent" />
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(item);
            }}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white transition hover:bg-white/10"
          >
            <LuStore className="h-5 w-5" />
            {cartQty > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {cartQty}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="text-lg font-black tracking-tight text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-slate-400 line-clamp-2">{item.description || 'No description available.'}</p>
        </div>
      </div>

      <div className="absolute inset-x-4 bottom-4 z-10 opacity-0 transition duration-300 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPurchase(item.id);
          }}
          disabled={purchaseLoading}
          className="w-full rounded-full bg-[#5865F2] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-[0_15px_40px_rgba(88,101,242,0.25)] transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:bg-white/10"
        >
          {purchaseLoading ? 'Satını Alınıyor...' : `Buy for ${formatPrice(item.price)}`}
        </button>
      </div>

      {purchaseMessage ? (
        <div className="absolute inset-x-4 bottom-20 rounded-3xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-slate-200">
          {purchaseMessage}
        </div>
      ) : null}
    </article>
  );
}

function StoreGrid() {
  const cart = useCart();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
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

  const handleOpenDetails = (item: StoreItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
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
                onOpenDetails={handleOpenDetails}
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
      <ProductDetailModal
        item={selectedItem}
        onClose={handleCloseDetails}
        onAddToCart={(item) => {
          cart.addToCart(item);
        }}
        onPurchase={(itemId) => {
          void handlePurchase(itemId);
        }}
      />
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
