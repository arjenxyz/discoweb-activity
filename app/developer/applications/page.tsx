'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EcoApp {
  id: string;
  guild_id: string;
  applicant_user_id: string;
  created_at: string;
  starter_package?: number;
}

interface IpoApp {
  id: string;
  guild_id: string;
  applicant_user_id: string;
  proposed_price: number;
  proposed_founder_ratio: number;
  guild_stats_snapshot: Record<string, unknown>;
  created_at: string;
}

export default function DeveloperApplicationsPage() {
  const [economy, setEconomy] = useState<EcoApp[]>([]);
  const [ipo, setIpo] = useState<IpoApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [starterPkg, setStarterPkg] = useState<Record<string, string>>({});

  const load = () => {
    fetch('/api/developer/applications')
      .then(r => r.json())
      .then(d => { setEconomy(d.economy ?? []); setIpo(d.ipo ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handle = async (type: string, id: string, action: string, pkg?: number) => {
    setProcessing(id);
    await fetch('/api/developer/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action, starter_package: pkg }),
    });
    setProcessing(null);
    load();
  };

  if (loading) return <div className="p-6 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bekleyen Başvurular</h1>
        <Link href="/developer" className="text-gray-400 hover:text-white text-sm">← Geri</Link>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Ekonomi Başvuruları ({economy.length})</h2>
        {economy.length === 0 ? <p className="text-gray-500 text-sm">Bekleyen başvuru yok.</p> : (
          <div className="space-y-3">
            {economy.map(app => (
              <div key={app.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-mono text-gray-300">Guild: {app.guild_id}</div>
                    <div className="text-xs text-gray-500 mt-1">Başvuran: {app.applicant_user_id} • {new Date(app.created_at).toLocaleDateString('tr-TR')}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-400">Başlangıç Paketi:</label>
                      <input
                        type="number"
                        value={starterPkg[app.id] ?? '100000'}
                        onChange={e => setStarterPkg(prev => ({ ...prev, [app.id]: e.target.value }))}
                        className="w-28 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      />
                      <span className="text-xs text-gray-500">Papel</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handle('economy', app.id, 'approve', parseInt(starterPkg[app.id] ?? '100000'))}
                      disabled={processing === app.id}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 rounded text-xs font-medium"
                    >✓ Onayla</button>
                    <button
                      onClick={() => handle('economy', app.id, 'reject')}
                      disabled={processing === app.id}
                      className="px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:bg-gray-600 rounded text-xs font-medium"
                    >✕ Reddet</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">IPO Başvuruları ({ipo.length})</h2>
        {ipo.length === 0 ? <p className="text-gray-500 text-sm">Bekleyen başvuru yok.</p> : (
          <div className="space-y-3">
            {ipo.map(app => (
              <div key={app.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-mono text-gray-300">Guild: {app.guild_id}</div>
                    <div className="text-xs text-gray-500 mt-1">Başvuran: {app.applicant_user_id} • {new Date(app.created_at).toLocaleDateString('tr-TR')}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Fiyat: <span className="text-white">{app.proposed_price?.toLocaleString()} Papel/lot</span>
                      {' • '}Founder: <span className="text-white">%{Math.round((app.proposed_founder_ratio ?? 0) * 100)}</span>
                    </div>
                    {app.guild_stats_snapshot && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Sunucu istatistikleri</summary>
                        <pre className="text-xs text-gray-400 mt-1 bg-gray-900 p-2 rounded">{JSON.stringify(app.guild_stats_snapshot, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handle('ipo', app.id, 'approve')}
                      disabled={processing === app.id}
                      className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 rounded text-xs font-medium"
                    >✓ Onayla</button>
                    <button
                      onClick={() => handle('ipo', app.id, 'reject')}
                      disabled={processing === app.id}
                      className="px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:bg-gray-600 rounded text-xs font-medium"
                    >✕ Reddet</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
