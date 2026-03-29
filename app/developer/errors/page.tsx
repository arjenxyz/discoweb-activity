'use client';

import { useEffect, useState, useCallback } from 'react';

type ErrorRow = {
  id: string;
  error_key: string;
  message: string;
  type: string | null;
  unique_ips: string[];
  total_hits: number;
  critical_alerted: boolean;
  last_seen: string;
  created_at: string;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  js_error:            { label: 'JS Hatası',           color: 'bg-red-500/20 text-red-300 border-red-500/25' },
  unhandled_rejection: { label: 'Promise Rejection',   color: 'bg-orange-500/20 text-orange-300 border-orange-500/25' },
  console_error:       { label: 'Console Error',       color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/25' },
  console_warn:        { label: 'Console Warn',        color: 'bg-amber-500/20 text-amber-300 border-amber-500/25' },
  slow_load:           { label: 'Yavaş Yükleme',       color: 'bg-blue-500/20 text-blue-300 border-blue-500/25' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  return `${Math.floor(h / 24)}g önce`;
}

export default function AdminErrorsPage() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical'>('all');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/developer/client-errors?page=${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.data ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      // sessizce
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch('/api/developer/client-errors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setRows(r => r.filter(x => x.id !== id));
      setTotal(t => t - 1);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'critical' ? rows.filter(r => r.critical_alerted) : rows;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="min-h-screen bg-[#070a10] text-white font-sans p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">İstemci Hata Logları</h1>
          <p className="text-sm text-white/40 mt-0.5">{total} kayıt · {rows.filter(r => r.critical_alerted).length} kritik</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/40 hover:text-white/60'}`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${filter === 'critical' ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'border-white/10 text-white/40 hover:text-white/60'}`}
          >
            Kritik
          </button>
          <button
            onClick={() => load(page)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/30">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-white/30">Kayıt bulunamadı</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(row => {
            const typeInfo = TYPE_LABELS[row.type ?? ''] ?? { label: row.type ?? 'Bilinmiyor', color: 'bg-white/10 text-white/50 border-white/10' };
            const isExpanded = expanded === row.id;

            return (
              <div
                key={row.id}
                className={`rounded-2xl border bg-white/[0.02] transition-all ${
                  row.critical_alerted
                    ? 'border-red-500/30 bg-red-500/[0.03]'
                    : 'border-white/[0.06]'
                }`}
              >
                {/* Ana satır */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : row.id)}
                >
                  {/* Kritik badge */}
                  {row.critical_alerted && (
                    <span className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5 text-red-400">
                        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047z" />
                      </svg>
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Tip + zaman */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-[10px] text-white/25">{timeAgo(row.last_seen)}</span>
                    </div>

                    {/* Mesaj */}
                    <p className="text-sm text-white/80 font-mono truncate">{row.message}</p>
                  </div>

                  {/* İstatistik */}
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-white">{row.unique_ips?.length ?? 0}</div>
                    <div className="text-[10px] text-white/30">kullanıcı</div>
                    <div className="text-[11px] font-semibold text-white/50 mt-0.5">{row.total_hits}×</div>
                  </div>
                </div>

                {/* Detay */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-3">
                    {/* Tam mesaj */}
                    <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                      <p className="text-[11px] font-mono text-white/60 whitespace-pre-wrap break-all">{row.message}</p>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                        <div className="text-white/30 mb-0.5">Toplam Hit</div>
                        <div className="font-bold text-white">{row.total_hits}</div>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                        <div className="text-white/30 mb-0.5">Benzersiz IP</div>
                        <div className="font-bold text-white">{row.unique_ips?.length ?? 0}</div>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                        <div className="text-white/30 mb-0.5">İlk Görülme</div>
                        <div className="font-bold text-white">{new Date(row.created_at).toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
                        <div className="text-white/30 mb-0.5">Son Görülme</div>
                        <div className="font-bold text-white">{timeAgo(row.last_seen)}</div>
                      </div>
                    </div>

                    {/* IP listesi */}
                    {row.unique_ips && row.unique_ips.length > 0 && (
                      <div>
                        <p className="text-[10px] text-white/30 mb-1">IP Adresleri</p>
                        <div className="flex flex-wrap gap-1">
                          {row.unique_ips.slice(0, 10).map((ip, i) => (
                            <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                              {ip}
                            </span>
                          ))}
                          {row.unique_ips.length > 10 && (
                            <span className="text-[10px] text-white/30 px-1">+{row.unique_ips.length - 10} daha</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sil */}
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="text-[11px] font-semibold text-red-400/60 hover:text-red-400 transition disabled:opacity-40"
                    >
                      {deleting === row.id ? 'Siliniyor...' : 'Kaydı Sil'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => load(page - 1)}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white disabled:opacity-30 transition"
          >
            ← Önceki
          </button>
          <span className="text-xs text-white/30">{page + 1} / {totalPages}</span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white disabled:opacity-30 transition"
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
