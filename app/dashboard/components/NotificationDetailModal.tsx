'use client';

import Image from 'next/image';
import {
  LuX, LuCalendar,
  LuCircleCheck, LuPackage
} from 'react-icons/lu';
import type { Notification } from '../types';
import { useT } from '@/contexts/LocaleContext';

type NotificationDetailModalProps = {
  notification: Notification | null;
  onClose: () => void;
  renderNotificationBody?: (body: string) => React.ReactNode;
};

export default function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const t = useT();

  if (!notification) return null;

  // --- VERİ AYRIŞTIRMA ---
  const parseReceiptData = (body: string) => {
    const lines = body.split('\n');
    const paymentMethod = body.match(/Ödeme Yöntemi:\s*(.*)/i)?.[1]?.trim();
    const balance = body.match(/Hesap Bakiyesi:\s*(.*)/i)?.[1]?.trim();
    const orderNo = body.match(/Sipariş No:\s*(.*)/i)?.[1]?.trim();
    
    const items = [];
    let isReadingItems = false;
    
    for (const line of lines) {
      if (line.includes('Ürünler:')) { isReadingItems = true; continue; }
      if (line.includes('Ara Toplam:')) { isReadingItems = false; break; }
      
      if (isReadingItems && line.trim().startsWith('•')) {
        const parts = line.replace('•', '').split('—');
        const titlePart = parts[0].trim();
        const price = parts[1]?.trim();
        const qtyMatch = titlePart.match(/x(\d+)$/);
        const qty = qtyMatch ? qtyMatch[1] : '1';
        const name = titlePart.replace(/x\d+$/, '').trim();
        items.push({ name, qty, price });
      }
    }

    const subtotal = body.match(/Ara Toplam:\s*(.*)/i)?.[1]?.trim();
    const discount = body.match(/İndirim:\s*(.*)/i)?.[1]?.trim();
    const total = body.match(/Toplam Ödenen:\s*(.*)/i)?.[1]?.trim();

    return { paymentMethod, balance, orderNo, items, subtotal, discount, total };
  };

  const data = parseReceiptData(notification.body);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      
      {/* Arka Plan */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {/* --- FİŞ KARTI (Auto-Height, Max-Screen) --- */}
      <div className="relative w-full max-w-[340px] flex flex-col bg-[#0b0d12] border-x border-t border-white/10 rounded-t-3xl shadow-[0_0_80px_-20px_rgba(88,101,242,0.4)] animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 max-h-[90vh]">
        
        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#5865F2]/10 rounded-full blur-[80px] pointer-events-none" />

        {/* --- 1. HEADER (Kapat Butonu Gizli, Kartın Üstüne Tıklayınca Kapanmaz) --- */}
        <div className="relative z-10 shrink-0 bg-gradient-to-b from-[#5865F2]/10 to-transparent p-4 pb-2 text-center border-b border-white/5 border-dashed">
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-white/30 hover:text-white transition-colors hover:bg-white/10 rounded-full">
            <LuX className="w-4 h-4" />
          </button>
          
          <div className="mx-auto w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center shadow-lg shadow-[#5865F2]/40 mb-2">
            <LuCircleCheck className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-white tracking-tight leading-none">{t('receipt_payment_success')}</h2>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-mono">{data.orderNo || '#SIP-0000'}</p>
        </div>

        {/* --- 2. GÖVDE (Scrollbar Gizli) --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          
          {/* Tarih & Kullanıcı */}
          <div className="flex items-center justify-between text-[10px] text-white/60 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/5">
             <div className="flex items-center gap-2">
                {notification.author_avatar_url && (
                  <Image src={notification.author_avatar_url} alt="u" width={16} height={16} className="rounded-full" />
                )}
                <span className="font-semibold">{notification.author_name}</span>
             </div>
             <div className="flex items-center gap-1 opacity-70">
                <LuCalendar className="w-3 h-3" />
                {new Date(notification.created_at).toLocaleDateString('tr-TR')}
             </div>
          </div>

          {/* Grid Bilgi */}
          <div className="grid grid-cols-2 gap-2">
             <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-bold text-white/30 mb-0.5">{t('receipt_method_label')}</span>
                <span className="text-[10px] font-bold text-white truncate w-full px-1">{data.paymentMethod || '-'}</span>
             </div>
             <div className="bg-white/[0.02] border border-white/5 p-2 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[9px] uppercase font-bold text-white/30 mb-0.5">{t('receipt_balance_label')}</span>
                <span className="text-[10px] font-bold text-emerald-400 truncate w-full px-1">{data.balance || '-'}</span>
             </div>
          </div>

          {/* Ürünler */}
          {data.items.length > 0 && (
            <div className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden">
               <div className="px-3 py-1.5 bg-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                  <LuPackage className="w-3 h-3" /> {t('receipt_items_title')}
               </div>
               <div className="p-1">
                 {data.items.map((item, idx) => (
                   <div key={idx} className="flex items-center justify-between p-2 hover:bg-white/5 transition-colors rounded-lg group">
                      <div className="flex items-center gap-2 overflow-hidden">
                         <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-white/5 rounded text-[9px] font-bold text-white/60">
                           {item.qty}
                         </span>
                         <span className="text-[11px] font-medium text-white/80 truncate">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-white/50 shrink-0 ml-2">{item.price}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* Ara Toplamlar */}
          <div className="space-y-0.5 pt-1 px-1">
             <div className="flex justify-between text-[10px] text-white/40">
                <span>{t('receipt_subtotal')}</span>
                <span>{data.subtotal || '-'}</span>
             </div>
             {data.discount && (
               <div className="flex justify-between text-[10px] text-emerald-400/80">
                  <span>{t('receipt_discount')}</span>
                  <span>{data.discount}</span>
               </div>
             )}
          </div>
        </div>

        {/* --- 3. FOOTER (Sabit Toplam & Tırtık) --- */}
        <div className="shrink-0 bg-[#0b0d12] pt-2 pb-1">
           {/* Toplam */}
           <div className="flex justify-between items-center border-t border-white/10 border-dashed pt-3 pb-4 px-5">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t('receipt_grand_total')}</span>
              <span className="text-xl font-black text-white tracking-tight">{data.total || '-'}</span>
           </div>

           {/* Fiş Tırtıkları */}
           <div className="relative h-3 w-full overflow-hidden">
              <div className="absolute bottom-0 w-full flex justify-between px-0.5">
                 {[...Array(24)].map((_, i) => (
                    <div key={i} className="w-3 h-3 bg-black rounded-full -mb-2" />
                 ))}
              </div>
           </div>
        </div>

      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}