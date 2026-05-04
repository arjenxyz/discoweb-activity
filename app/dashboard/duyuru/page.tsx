'use client';

import Image from 'next/image';
import { LuHeart, LuGift, LuChevronRight } from 'react-icons/lu';

const shopItems = [
  {
    title: 'Star Struck Bundle',
    price: 'TRY 168.99',
    badge: '-11%',
    isFeatured: true,
    image: '/shop/star-struck.png', // Görsel yollarını kendine göre düzenleyebilirsin
  },
  {
    title: 'Story Time Bundle',
    price: 'TRY 168.99',
    badge: '-11%',
    isFeatured: false,
    image: '/shop/story-time.png',
  },
  {
    title: 'Cloud Nine',
    price: 'TRY 62.99',
    isFeatured: false,
    image: '/shop/cloud-nine.png',
  },
  {
    title: 'Slow Burn',
    price: 'TRY 62.99',
    isFeatured: false,
    image: '/shop/slow-burn.png',
  },
];

function ShopCard({ item }: { item: typeof shopItems[number] }) {
  return (
    <div className="flex flex-col gap-3 group cursor-pointer">
      {/* Kart İçeriği */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#111214]/80 border border-white/5 p-4 transition-all hover:bg-[#111214]">
        {/* Favori Butonu */}
        <button className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-lg bg-black/40 text-white/70 backdrop-blur-md transition hover:text-white">
          <LuHeart className="h-5 w-5" />
        </button>

        {/* Görsel Önizleme Alanı (Discord Logo/Karakter vs.) */}
        <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#1e1f22]">
           {/* Buraya item.image gelecek, şimdilik placeholder */}
           <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <div className="h-20 w-20 rounded-full bg-white/10 blur-2xl" />
           </div>
           
           {/* Alt Bilgi Paneli (Örn: Avatar/İsim) */}
           {item.isFeatured && (
             <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-black/60 p-2 backdrop-blur-md border border-white/10">
                <div className="h-8 w-8 rounded-full bg-slate-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-white">Arjen 🐱‍👤</span>
                  <div className="h-1 w-16 rounded-full bg-white/20" />
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Kart Alt Bilgileri */}
      <div className="px-1">
        <h3 className="text-sm font-bold text-white">{item.title}</h3>
        
        {item.isFeatured ? (
          <div className="mt-3 flex items-center gap-2">
            <button className="flex-1 rounded-md bg-[#5865F2] py-2 text-xs font-bold text-white transition hover:bg-[#4752c4]">
              Buy for {item.price}
            </button>
            <button className="flex h-9 w-10 items-center justify-center rounded-md bg-[#5865F2] text-white transition hover:bg-[#4752c4]">
              <LuGift className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs font-bold text-white">{item.price}</span>
            {item.badge && (
              <span className="text-[10px] font-bold text-green-400">({item.badge})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DuyuruPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] font-sans">
      {/* Arka Plan Görseli */}
      <div className="fixed inset-0 z-0">
        <Image 
          src="/menu-background/varyant5.jpg" 
          alt="Background" 
          fill 
          className="object-cover opacity-60" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0a0a0a]/80 to-[#0a0a0a]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-8 py-12">
        {/* Üst Header Kısmı */}
        <header className="mb-12 flex items-center justify-between">
          <div className="flex flex-col gap-2">
             {/* Logo Alanı */}
             <div className="h-20 w-48 relative">
                {/* Buraya 'Cozy Getaway' logosunu koyabilirsin */}
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-orange-900/40 border-2 border-orange-700/50 text-xl font-black italic tracking-tighter text-orange-200">
                  COZY GETAWAY
                </div>
             </div>
          </div>
          
          <button className="rounded-md bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-gray-200">
            Shop the Collection
          </button>
        </header>

        {/* Grid Yapısı ve Sağ Ok */}
        <div className="relative">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shopItems.map((item) => (
              <ShopCard key={item.title} item={item} />
            ))}
          </div>

          {/* Sağ Kaydırma Oku */}
          <button className="absolute -right-4 top-1/2 flex h-10 w-10 -translate-y-12 items-center justify-center rounded-lg bg-[#111214] text-white shadow-xl border border-white/5 transition hover:bg-[#1e1f22]">
            <LuChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}