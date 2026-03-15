'use client';

import { useMemo, useState } from 'react';
import { apiUrl } from '@/lib/api';
import type { MailItem } from '../types';
import { 
  LuMail, LuMailOpen, LuArchive, LuTrash2, LuCheckCheck, 
  LuGift, LuMegaphone, LuWrench, LuStar, LuRefreshCw, LuReceipt,
  LuChevronLeft, LuSearch 
} from 'react-icons/lu';

const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;?/g, ' ');

const previewText = (s?: string, max = 120) => {
  const t = stripHtml(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

const CATEGORY_LABELS: Record<string, string> = {
  announcement: 'Duyurular',
  system: 'Sistem',
  maintenance: 'Bakım',
  sponsor: 'Sponsor',
  update: 'Güncelleme',
  lottery: 'Promosyonlar',
  reward: 'Siparişler',
};

const FIXED_CATEGORIES = ['announcement', 'system', 'update', 'maintenance', 'reward', 'lottery', 'sponsor'] as const;

// Kategoriye özel ikon ve renk ayarları
const getCategoryStyle = (category: string) => {
  switch (category) {
    case 'system':
      return { css: 'border-red-500/30 bg-red-500/10 text-red-400', icon: <LuMail /> };
    case 'maintenance':
      return { css: 'border-amber-500/30 bg-amber-500/10 text-amber-400', icon: <LuWrench /> };
    case 'sponsor':
      return { css: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400', icon: <LuStar /> };
    case 'update':
      return { css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400', icon: <LuRefreshCw /> };
    case 'lottery':
      return { css: 'border-rose-500/30 bg-rose-500/10 text-rose-400', icon: <LuGift /> };
    case 'reward':
      return { css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400', icon: <LuReceipt /> };
    default: // announcement
      return { css: 'border-[#5865F2]/30 bg-[#5865F2]/10 text-[#5865F2]', icon: <LuMegaphone /> };
  }
};

type MailSectionProps = {
  loading: boolean;
  error: string | null;
  items: MailItem[];
  onOpenMail: (mail: MailItem) => void;
  onBack?: () => void;
};

export default function MailSection({
  loading,
  error,
  items,
  onOpenMail,
  onBack,
}: MailSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | string>('all');
  
  

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({ open: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type });
    setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  };

  // Total counts (for header) and unread counts (for folder badges)
  const countsTotal = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc.all = (acc.all ?? 0) + 1;
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, { all: 0 });
  }, [items]);

  const countsUnread = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      const unread = item.is_read ? 0 : 1;
      acc.all = (acc.all ?? 0) + unread;
      acc[item.category] = (acc[item.category] ?? 0) + unread;
      return acc;
    }, { all: 0 });
  }, [items]);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const navItems = [
    { key: 'all', label: 'Gelen Kutusu', icon: <LuArchive /> },
    ...FIXED_CATEGORIES.map((category) => ({ 
        key: category, 
        label: CATEGORY_LABELS[category] ?? category,
        icon: getCategoryStyle(category).icon 
    })),
  ];

  return (
    <section className="relative w-full h-[calc(100vh-4rem)] overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl transition-all">
      
      {/* Arkaplan Süslemeleri */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* --- HEADER --- */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-8 py-6 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-[#5865F2] to-indigo-600 rounded-2xl shadow-lg shadow-[#5865F2]/20">
             <LuMail className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5865F2]">İletişim</p>
            <h2 className="text-xl font-bold text-white tracking-tight">Posta Kutusu</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <LuChevronLeft className="w-4 h-4" /> Geri
            </button>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-white/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {countsTotal.all ?? 0} Mesaj
          </div>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col md:flex-row">
        
        {/* --- SIDEBAR (NAVİGASYON) --- */}
        <div className="md:w-72 border-r border-white/10 bg-[#0b0d12]/30 backdrop-blur-md">
          <div className="px-6 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 px-2">Klasörler</p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeCategory === item.key;
                const count = countsUnread[item.key] ?? 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveCategory(item.key)}
                    className={`group relative flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-[#5865F2]/10 text-white shadow-[inset_4px_0_0_0_#5865F2]'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`text-lg transition-colors ${isActive ? 'text-[#5865F2]' : 'text-white/40 group-hover:text-white'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    {count > 0 && (
                      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold ${
                        isActive ? 'bg-[#5865F2] text-white' : 'bg-white/10 text-white/60'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT (LİSTE) --- */}
        <div className="flex-1 bg-gradient-to-b from-transparent to-[#0b0d12]/20">
          <div className="flex flex-col h-full">
            
            {/* Liste Başlığı */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {activeCategory === 'all' ? 'Tüm Mesajlar' : CATEGORY_LABELS[activeCategory]}
                <span className="text-xs font-normal text-white/40 ml-2 border-l border-white/10 pl-3">
                    {filtered.length} adet bulundu
                </span>
              </h3>
              {/* Basit Arama İkonu (Dekoratif) */}
              <div className="p-2 rounded-lg bg-white/5 text-white/30">
                  <LuSearch className="w-4 h-4" />
              </div>
            </div>

            {/* Mesaj Listesi */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {loading && (
                  <div className="flex flex-col items-center justify-center h-40 text-white/50 animate-pulse">
                      <LuRefreshCw className="w-8 h-8 animate-spin mb-2" />
                      Yükleniyor...
                  </div>
              )}
              
              {!loading && error && <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 text-center">{error}</div>}
              
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <LuArchive className="w-8 h-8 text-white/20" />
                   </div>
                   <p className="text-white font-bold">Kutu Boş</p>
                   <p className="text-sm text-white/40 mt-1">Bu kategoride henüz bir mesajın yok.</p>
                </div>
              )}

              {(!loading && !error) && filtered.map((item) => {
                 const style = getCategoryStyle(item.category);
                 return (
                  <div key={item.id} className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenMail(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenMail(item);
                      }
                    }}
                    className={`group relative flex w-full max-w-3xl items-start gap-4 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${
                      item.is_read
                        ? 'border-white/5 bg-[#0b0d12]/40 opacity-70 hover:opacity-100 hover:bg-[#0b0d12]/60 hover:border-white/10'
                        : 'border-[#5865F2]/20 bg-gradient-to-r from-[#5865F2]/5 to-transparent hover:border-[#5865F2]/40 hover:shadow-[0_10px_30px_-10px_rgba(88,101,242,0.15)]'
                    }`}
                  >
                    {/* Tekil silme butonu - tıklama mail açmayı tetiklemesin */}
                    <div className="absolute right-4 top-4 z-20">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await fetch(apiUrl('/api/mail'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [item.id] }) });
                            showToast('Mesaj silindi', 'success');
                            window.dispatchEvent(new CustomEvent('mail:refresh'));
                          } catch (err) {
                            console.error(err);
                            showToast('Silme hatası', 'error');
                          }
                        }}
                        className="rounded-full p-2 bg-white/5 hover:bg-white/10 text-white/60"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Okundu/Okunmadı İkonu */}
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                        item.is_read 
                            ? 'border-white/5 bg-white/5 text-white/20' 
                            : 'border-[#5865F2]/30 bg-[#5865F2]/20 text-[#5865F2] shadow-[0_0_15px_rgba(88,101,242,0.3)]'
                    }`}>
                        {item.is_read ? <LuMailOpen className="w-5 h-5" /> : <LuMail className="w-5 h-5" />}
                    </div>

                      <div className="flex-1 min-w-0 text-left pr-12">
                      <div className="flex items-center justify-between mb-1">
                         <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.css}`}>
                            {style.icon && <span className="text-sm">{style.icon}</span>}
                            {CATEGORY_LABELS[item.category] ?? item.category}
                         </span>
                         <span className="text-[10px] font-medium text-white/30 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}
                         </span>
                      </div>
                      
                      <h4 className={`text-sm font-bold truncate ${item.is_read ? 'text-white/60' : 'text-white'}`}>
                          {item.title}
                      </h4>
                        <p className="mt-1 text-xs text-white/40 line-clamp-1 font-medium group-hover:text-white/60 transition-colors">
                          {previewText(item.body)}
                        </p>
                    </div>
                  </div>
                 </div>
                )
              })}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-white/10 bg-[#0b0d12]/30 p-4 flex flex-wrap items-center justify-end gap-3 backdrop-blur-md">
                <button
                  type="button"
                  onClick={async () => {
                    const ids = filtered.map((m) => m.id);
                    if (ids.length === 0) return showToast('Silinecek mesaj yok', 'error');
                    try {
                      await fetch(apiUrl('/api/mail'), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                      showToast('Mailler silindi', 'success');
                      window.dispatchEvent(new CustomEvent('mail:refresh'));
                    } catch (e) {
                      console.error(e);
                      showToast('Silme hatası', 'error');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors`}
                >
                    <LuTrash2 className="w-4 h-4" /> Hepsini Sil
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ids = filtered.filter((m) => !m.is_read).map((m) => m.id);
                    if (ids.length === 0) return showToast('Okunmamış mesaj yok', 'error');
                    try {
                      await fetch(apiUrl('/api/mail'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                      showToast('Tüm mesajlar okundu olarak işaretlendi', 'success');
                      window.dispatchEvent(new CustomEvent('mail:refresh'));
                    } catch (e) {
                      console.error(e);
                      showToast('İşlem başarısız', 'error');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs font-bold text-white hover:bg-white/10 transition-colors`}
                >
                    <LuCheckCheck className="w-4 h-4" /> Tümünü Okundu Say
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ids = filtered.filter((m) => m.category === 'reward' && !m.is_read).map((m) => m.id);
                    if (ids.length === 0) return showToast('Talep edilecek ödül yok', 'error');
                    try {
                      await fetch(apiUrl('/api/mail'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                      showToast('Ödüller talep edildi (okundu sayıldı)', 'success');
                      window.dispatchEvent(new CustomEvent('mail:refresh'));
                    } catch (e) {
                      console.error(e);
                      showToast('Talep başarısız', 'error');
                    }
                  }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 text-xs font-bold text-white shadow-lg`}
                >
                    <LuGift className="w-4 h-4" /> Hepsini Al
                </button>

            {/* Toast */}
            {toast.open && (
              <div className={`fixed right-4 bottom-6 z-[9999] rounded-lg px-4 py-2 shadow-lg ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {toast.message}
              </div>
            )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}