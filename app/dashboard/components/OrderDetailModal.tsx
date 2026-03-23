import React from 'react';
import { LuX, LuCalendar, LuCreditCard, LuPackage, LuLoaderCircle, LuHash } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

type OrderItem = {
  title: string;
  qty: number;
  price: number;
  total: number;
};

type Order = {
  id: string | number;
  amount: number;
  status: string;
  items?: OrderItem[];
  failure_reason?: string | null;
  created_at: string | Date;
  expires_at?: string | Date | null;
  details_url?: string;
};

function getStatusBadge(status: string, t: (key: string) => string) {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'success') {
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('order_status_paid')}</span>;
  }
  if (s === 'pending' || s === 'processing') {
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">{t('order_status_processing')}</span>;
  }
  if (s === 'failed' || s === 'cancelled') {
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">{t('order_status_failed')}</span>;
  }
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
}

export default function OrderDetailModal({ order, onClose } : { order: Order; onClose: () => void }) {
  const t = useT();
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 max-w-md w-full bg-[#0b0d12] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header Section */}
        <div className="flex items-start justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <LuCreditCard className="w-5 h-5 text-gray-400" />
              {t('order_detail_title')}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[11px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                <LuHash className="w-3 h-3 opacity-50" />
                {order.id}
              </span>
              <span className="text-xs text-gray-600">•</span>
              {getStatusBadge(order.status, t)}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5">
            <LuX className="w-5 h-5"/>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">{t('order_detail_total_amount')}</p>
              <p className="text-xl font-bold text-white font-mono tracking-tight">{Number(order.amount).toFixed(2)} <span className="text-sm font-normal text-gray-400">Papel</span></p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <LuCalendar className="w-3 h-3" /> {t('order_detail_date')}
              </p>
              <p className="text-sm font-medium text-gray-300 mt-1.5">
                {new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[11px] text-gray-500">
                {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Line Items (Hizmet Dökümü) */}
          {order.items && order.items.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <LuPackage className="w-3.5 h-3.5" /> {t('order_detail_service_breakdown')}
              </h4>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] divide-y divide-white/5">
                {order.items.map((it: OrderItem, idx: number) => (
                  <div key={idx} className="p-3 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-200">{it.title}</span>
                      <span className="text-[11px] text-gray-500 font-mono mt-0.5">
                        {t('order_detail_unit', { qty: String(it.qty), price: Number(it.price).toFixed(2) })}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white font-mono">
                      {Number(it.total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failure Reason (If any) */}
          {order.failure_reason && (
            <div className="p-3 bg-rose-500/5 rounded-lg border border-rose-500/10 flex items-start gap-3">
              <LuLoaderCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wide">{t('order_detail_system_message')}</p>
                <p className="text-sm text-rose-300/80 mt-1 leading-relaxed">
                  {order.failure_reason}
                </p>
              </div>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {order.expires_at && (
                <span className="text-[10px] text-gray-600 font-mono">
                  {t('order_detail_expiry', { date: new Date(order.expires_at).toLocaleString('tr-TR') })}
                </span>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
