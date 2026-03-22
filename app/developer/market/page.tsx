'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Listing {
  guild_id: string;
  status: string;
  market_price: number;
  ipo_price: number;
  total_lots: number;
  circuit_breaker_until: string | null;
  listed_at: string;
  server_penalties?: Array<{ type: string; is_active: boolean }>;
}

export default function DeveloperMarketPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/market-listings')
      .then(r => r.json())
      .then(d => setListings(d.listings ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Borsa Listeleri</h1>
        <Link href="/developer" className="text-gray-400 hover:text-white text-sm">← Geri</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700 text-left">
              <th className="pb-3 pr-4">Guild ID</th>
              <th className="pb-3 pr-4">Durum</th>
              <th className="pb-3 pr-4">Piyasa Fiyatı</th>
              <th className="pb-3 pr-4">IPO Fiyatı</th>
              <th className="pb-3 pr-4">Ceza</th>
              <th className="pb-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {listings.map(l => (
              <tr key={l.guild_id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4 font-mono text-xs">{l.guild_id}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    l.status === 'approved' ? 'bg-green-900 text-green-300' :
                    l.status === 'suspended' ? 'bg-yellow-900 text-yellow-300' :
                    l.status === 'delisted' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'
                  }`}>{l.status}</span>
                  {l.circuit_breaker_until && new Date(l.circuit_breaker_until) > new Date() && (
                    <span className="ml-1 px-2 py-0.5 rounded text-xs bg-orange-900 text-orange-300">⚡ CB</span>
                  )}
                </td>
                <td className="py-3 pr-4">{l.market_price?.toLocaleString()} P</td>
                <td className="py-3 pr-4">{l.ipo_price?.toLocaleString()} P</td>
                <td className="py-3 pr-4">
                  {l.server_penalties?.some(p => p.is_active) ? '⚠️' : '—'}
                </td>
                <td className="py-3">
                  <Link href={`/developer/market/${l.guild_id}`} className="text-blue-400 hover:text-blue-300 text-xs">
                    Detay + AI →
                  </Link>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">Henüz listelenen sunucu yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
