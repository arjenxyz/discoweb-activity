'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getClientErrors } from '@/lib/clientErrorStore';
import { apiUrl } from '@/lib/api';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'not_found';

type Report = {
  id: string;
  section: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

type Props = { onClose: () => void; section?: string };

const STATUS_CONFIG: Record<ReportStatus, { label: string; sub: string; color: string; dot: string; icon: string }> = {
  pending: {
    label: 'Beklemede',
    sub: 'Raporun inceleme sırasına eklendi.',
    color: 'border-white/10 bg-white/5',
    dot: 'bg-white/30',
    icon: '⏳',
  },
  reviewing: {
    label: 'İnceleniyor',
    sub: 'Ekibimiz bu hatayı inceliyor.',
    color: 'border-amber-500/30 bg-amber-500/10',
    dot: 'bg-amber-400',
    icon: '🔍',
  },
  resolved: {
    label: 'Çözüldü',
    sub: 'Raporun için teşekkürler, sorun giderildi.',
    color: 'border-green-500/30 bg-green-500/10',
    dot: 'bg-green-400',
    icon: '✅',
  },
  not_found: {
    label: 'Tespit Edilemedi',
    sub: 'Sorunu yeniden üretemedi. Discord\'dan destek alabilirsin.',
    color: 'border-red-500/20 bg-red-500/5',
    dot: 'bg-red-400',
    icon: '❓',
  },
};

function authHeaders(): HeadersInit {
  try {
    const token = localStorage.getItem('discord_bearer_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

export default function BugReportModal({ onClose, section }: Props) {
  const [tab, setTab] = useState<'new' | 'list'>('new');

  // --- New report state ---
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeReportStatus, setActiveReportStatus] = useState<ReportStatus>('pending');
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Reports list state ---
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Poll active report status
  useEffect(() => {
    if (!activeReportId) return;
    const poll = async () => {
      try {
        const res = await fetch(apiUrl(`/api/support/bug-report/status?id=${activeReportId}`), { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json() as { status: ReportStatus };
        setActiveReportStatus(data.status);
        if (data.status === 'resolved' || data.status === 'not_found') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeReportId]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/support/bug-report/my-reports'), { headers: authHeaders() });
      if (res.ok) setReports(await res.json() as Report[]);
    } catch { /* ignore */ }
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'list') loadReports();
  }, [tab, loadReports]);

  // Refresh selected report status
  useEffect(() => {
    if (!selectedReport) return;
    const updated = reports.find(r => r.id === selectedReport.id);
    if (updated) setSelectedReport(updated);
  }, [reports]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImage(file);
  };

  const handleSubmit = async () => {
    if (!description.trim() || sendStatus === 'sending') return;
    setSendStatus('sending');

    const ls = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const win = typeof window !== 'undefined' ? window : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (nav as any)?.connection ?? (nav as any)?.mozConnection ?? (nav as any)?.webkitConnection;
    const perf = win?.performance;
    const navEntry = perf?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;

    const sessionInfo = {
      url: win?.location.href ?? '',
      timestamp: new Date().toISOString(),
      locale: nav?.language ?? '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: nav?.onLine ?? true,
      screenSize: win ? `${win.screen.width}×${win.screen.height}` : '',
      viewport: win ? `${win.innerWidth}×${win.innerHeight}` : '',
      devicePixelRatio: win?.devicePixelRatio ?? 1,
      colorDepth: win?.screen.colorDepth ?? 0,
      userAgent: nav?.userAgent ?? '',
      platform: nav?.platform ?? '',
      cookiesEnabled: nav?.cookieEnabled ?? false,
      doNotTrack: nav?.doNotTrack ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoryMB: (perf as any)?.memory
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? `${Math.round((perf as any).memory.usedJSHeapSize / 1048576)}MB / ${Math.round((perf as any).memory.jsHeapSizeLimit / 1048576)}MB`
        : null,
      connectionType: conn?.effectiveType ?? null,
      downlink: conn?.downlink ? `${conn.downlink} Mbps` : null,
      rtt: conn?.rtt ? `${conn.rtt}ms` : null,
      pageLoadMs: navEntry ? Math.round(navEntry.loadEventEnd - navEntry.startTime) : null,
      domInteractiveMs: navEntry ? Math.round(navEntry.domInteractive - navEntry.startTime) : null,
      guildId: ls('selectedGuildId'),
      frameId: ls('discord_frame_id'),
      instanceId: ls('discord_instance_id'),
      authMethod: ls('discord_bearer_token') ? 'bearer_token' : 'cookie_session',
      theme: ls('uiTheme') ?? ls('mailSectionTheme'),
    };

    const errorLog = getClientErrors();

    try {
      const fd = new FormData();
      fd.append('description', description);
      if (section) fd.append('section', section);
      fd.append('sessionInfo', JSON.stringify(sessionInfo));
      fd.append('errorLog', JSON.stringify(errorLog));
      if (imageFile) fd.append('image', imageFile);

      const res = await fetch(apiUrl('/api/support/bug-report'), { method: 'POST', headers: authHeaders(), body: fd });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { reportId?: string };
      if (data.reportId) setActiveReportId(data.reportId);
      setSendStatus('success');
    } catch {
      setSendStatus('error');
    }
  };

  // Shared header
  const header = (
    <div className="flex items-center gap-3 pr-10">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20 flex-shrink-0">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-red-400">
          <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
        </svg>
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">Destek</h2>
        <p className="text-xs text-white/40">Hata bildir veya raporlarını takip et</p>
      </div>
    </div>
  );

  const cfg = STATUS_CONFIG[activeReportStatus];

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition z-10"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>

        <div className="px-6 pt-6 pb-6 flex flex-col gap-4">
          {header}

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setTab('new')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === 'new' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              Hata Bildir
            </button>
            <button
              type="button"
              onClick={() => setTab('list')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              Raporlarım
            </button>
          </div>

          {/* ── TAB: Hata Bildir ── */}
          {tab === 'new' && (
            <>
              {sendStatus === 'success' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-3 py-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-white">Rapor gönderildi!</p>
                    <p className="text-xs text-white/40">Raporlarım sekmesinden durumunu takip edebilirsin.</p>
                  </div>

                  {/* Status card */}
                  <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors ${cfg.color}`}>
                    <span className="text-lg leading-none mt-0.5">{cfg.icon}</span>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="text-sm font-semibold text-white">{cfg.label}</span>
                      <span className="text-xs text-white/50">{cfg.sub}</span>
                    </div>
                    {activeReportStatus === 'reviewing' && (
                      <svg className="h-4 w-4 animate-spin text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                        <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>

                  {activeReportStatus === 'not_found' && (
                    <button
                      type="button"
                      onClick={() => window.open('https://discord.gg/fDPsYhvKmu', '_blank', 'noopener,noreferrer')}
                      className="w-full rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 py-2.5 text-sm font-semibold text-[#5865F2] hover:bg-[#5865F2]/20 transition flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                      </svg>
                      Discord Destek Sunucusu
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setSendStatus('idle'); setDescription(''); setImageFile(null); setImagePreview(null); setActiveReportId(null); }}
                    className="text-xs text-white/30 hover:text-white/60 transition text-center"
                  >
                    Yeni rapor gönder
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Açıklama</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Ne oldu? Hangi adımları izledin?"
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ekran Görüntüsü <span className="text-white/25 normal-case">(isteğe bağlı)</span></label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileRef.current?.click()}
                      className="relative cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/3 hover:bg-white/5 hover:border-white/25 transition flex items-center justify-center min-h-[72px] overflow-hidden"
                    >
                      {imagePreview ? (
                        <div className="relative w-full">
                          <img src={imagePreview} alt="preview" className="w-full max-h-36 object-contain rounded-xl" />
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                            className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-white transition"
                          >
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-4 px-4 text-center">
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-white/25">
                            <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
                          </svg>
                          <span className="text-xs text-white/30">Sürükle bırak veya tıkla</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/3 px-3 py-2">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#5865F2] flex-shrink-0">
                      <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                    </svg>
                    <span className="text-xs text-white/35">URL, ekran boyutu, tarayıcı bilgisi ve hata logları otomatik eklenir.</span>
                  </div>

                  {sendStatus === 'error' && (
                    <p className="text-xs text-red-400 text-center">Gönderim başarısız, tekrar dene.</p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!description.trim() || sendStatus === 'sending'}
                    className="w-full rounded-xl border border-white/10 bg-white/8 py-2.5 text-sm font-semibold text-white hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {sendStatus === 'sending' ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                          <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Gönderiliyor...
                      </>
                    ) : 'Raporu Gönder'}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── TAB: Raporlarım ── */}
          {tab === 'list' && (
            <>
              {/* Detail view */}
              {selectedReport ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition w-fit"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" />
                    </svg>
                    Geri
                  </button>

                  {/* Status */}
                  {(() => {
                    const c = STATUS_CONFIG[selectedReport.status];
                    return (
                      <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${c.color}`}>
                        <span className="text-xl leading-none mt-0.5">{c.icon}</span>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-sm font-bold text-white">{c.label}</span>
                          <span className="text-xs text-white/50">{c.sub}</span>
                        </div>
                        {selectedReport.status === 'reviewing' && (
                          <svg className="h-4 w-4 animate-spin text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                            <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                    );
                  })()}

                  {/* Meta */}
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Rapor No</span>
                      <span className="text-xs font-mono text-white/70">{selectedReport.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {selectedReport.section && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Bölüm</span>
                        <span className="text-xs text-white/70 capitalize">{selectedReport.section}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">Gönderildi</span>
                      <span className="text-xs text-white/70">{new Date(selectedReport.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                    {selectedReport.updated_at !== selectedReport.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Güncellendi</span>
                        <span className="text-xs text-white/70">{new Date(selectedReport.updated_at).toLocaleString('tr-TR')}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Açıklama</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>

                  {selectedReport.status === 'not_found' && (
                    <button
                      type="button"
                      onClick={() => window.open('https://discord.gg/fDPsYhvKmu', '_blank', 'noopener,noreferrer')}
                      className="w-full rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 py-2.5 text-sm font-semibold text-[#5865F2] hover:bg-[#5865F2]/20 transition flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path d="M13.545 2.907a13.227 13.227 0 00-3.257-1.011.05.05 0 00-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 00-3.658 0 8.258 8.258 0 00-.412-.833.051.051 0 00-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 00-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 003.995 2.02.05.05 0 00.056-.019c.308-.42.582-.863.818-1.329a.05.05 0 00-.01-.059.051.051 0 00-.018-.011 8.875 8.875 0 01-1.248-.595.05.05 0 01-.02-.066.051.051 0 01.015-.019c.084-.063.168-.129.248-.195a.05.05 0 01.051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 01.053.007c.08.066.164.132.248.195a.051.051 0 01-.004.085 8.254 8.254 0 01-1.249.594.05.05 0 00-.03.03.052.052 0 00.003.041c.24.465.515.909.817 1.329a.05.05 0 00.056.019 13.235 13.235 0 004.001-2.02.049.049 0 00.021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 00-.02-.019zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612z" />
                      </svg>
                      Discord Destek Sunucusu
                    </button>
                  )}
                </div>
              ) : (
                /* List view */
                <div className="flex flex-col gap-2">
                  {reportsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="h-5 w-5 animate-spin text-white/30" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                        <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-8 w-8 text-white/10">
                        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                      </svg>
                      <p className="text-sm text-white/30">Henüz rapor göndermedin</p>
                    </div>
                  ) : (
                    <>
                      {reports.map(r => {
                        const c = STATUS_CONFIG[r.status];
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedReport(r)}
                            className="w-full flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2.5 text-left transition group"
                          >
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${c.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 truncate leading-tight">{r.description}</p>
                              <p className="text-[11px] text-white/30 mt-0.5">{new Date(r.created_at).toLocaleDateString('tr-TR')} · #{r.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                r.status === 'reviewing'  ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                                r.status === 'resolved'   ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                r.status === 'not_found'  ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                'text-white/40 border-white/10 bg-white/5'
                              }`}>{c.label}</span>
                            </div>
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition flex-shrink-0">
                              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06L7.28 11.78a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" />
                            </svg>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={loadReports}
                        className="text-xs text-white/25 hover:text-white/50 transition text-center pt-1"
                      >
                        Yenile
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
