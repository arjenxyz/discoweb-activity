'use client';

import { useEffect, useState } from 'react';
import { LuFlame, LuVault, LuTrendingUp, LuGift } from 'react-icons/lu';
import { apiUrl } from '@/lib/api';

type Treasury = {
  balance: number;
  total_collected: number;
  total_burned: number;
  total_dividends_paid: number;
  updated_at: string | null;
};

export default function TreasuryCard() {
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdvanced, setIsAdvanced] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/member/treasury'))
      .then((r) => r.json())
      .then((d) => {
        if (d.economy_tier === 'advanced' && d.treasury) {
          setIsAdvanced(true);
          setTreasury(d.treasury);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !isAdvanced || !treasury) return null;

  const fmt = (n: number) =>
    Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 });

  const stats = [
    { icon: LuVault,      label: 'Hazine Bakiyesi', value: fmt(treasury.balance),              color: 'text-blue-400' },
    { icon: LuTrendingUp, label: 'Toplam Toplanan',  value: fmt(treasury.total_collected),       color: 'text-emerald-400' },
    { icon: LuFlame,      label: 'Toplam Yakılan',   value: fmt(treasury.total_burned),          color: 'text-orange-400' },
    { icon: LuGift,       label: 'Dağıtılan Temettü',value: fmt(treasury.total_dividends_paid),  color: 'text-purple-400' },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <LuVault className="h-4 w-4 text-blue-400" />
        <p className="text-sm font-bold text-white">Sunucu Hazinesi</p>
        <span className="ml-auto rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
          Yüksek Ekonomi
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl bg-white/[0.03] p-3">
            <Icon className={`mb-1.5 h-4 w-4 ${color}`} />
            <p className="text-[11px] text-white/40">{label}</p>
            <p className={`mt-0.5 text-base font-black ${color}`}>{value}</p>
            <p className="text-[10px] text-white/25">Papel</p>
          </div>
        ))}
      </div>
    </div>
  );
}
