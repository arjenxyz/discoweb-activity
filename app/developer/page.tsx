'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  economy: Array<{ id: string; guild_id: string; created_at: string; starter_package: number }>;
  ipo: Array<{ id: string; guild_id: string; created_at: string; proposed_price: number }>;
}

export default function DeveloperPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/developer/applications').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Developer Paneli</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Bekleyen Ekonomi Başvurusu" value={stats?.economy.length ?? '—'} />
        <StatCard title="Bekleyen IPO Başvurusu" value={stats?.ipo.length ?? '—'} />
        <StatCard title="Toplam Başvuru" value={stats ? (stats.economy.length + stats.ipo.length) : '—'} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NavCard href="/developer/market" title="Borsa Yönetimi" desc="Tüm listeler, AI analiz, piyasa müdahalesi" />
        <NavCard href="/developer/applications" title="Başvurular" desc="Ekonomi ve IPO başvurularını onayla / reddet" />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="text-gray-400 text-sm mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-blue-500 transition-colors block">
      <div className="text-lg font-semibold text-white mb-1">{title}</div>
      <div className="text-gray-400 text-sm">{desc}</div>
    </Link>
  );
}
