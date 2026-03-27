'use client';

import { useState, useRef } from 'react';
import { getClientErrors } from '@/lib/clientErrorStore';
import { apiUrl } from '@/lib/api';

type Props = { onClose: () => void };

export default function BugReportModal({ onClose }: Props) {
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!description.trim() || status === 'sending') return;
    setStatus('sending');

    const ls = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const win = typeof window !== 'undefined' ? window : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (nav as any)?.connection ?? (nav as any)?.mozConnection ?? (nav as any)?.webkitConnection;
    const perf = win?.performance;
    const navEntry = perf?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;

    const sessionInfo = {
      // Sayfa
      url: win?.location.href ?? '',
      timestamp: new Date().toISOString(),
      locale: nav?.language ?? '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: nav?.onLine ?? true,

      // Ekran & Viewport
      screenSize: win ? `${win.screen.width}×${win.screen.height}` : '',
      viewport: win ? `${win.innerWidth}×${win.innerHeight}` : '',
      devicePixelRatio: win?.devicePixelRatio ?? 1,
      colorDepth: win?.screen.colorDepth ?? 0,

      // Tarayıcı
      userAgent: nav?.userAgent ?? '',
      platform: nav?.platform ?? '',
      cookiesEnabled: nav?.cookieEnabled ?? false,
      doNotTrack: nav?.doNotTrack ?? null,

      // Bellek (Chrome only)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoryMB: (perf as any)?.memory
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? `${Math.round((perf as any).memory.usedJSHeapSize / 1048576)}MB / ${Math.round((perf as any).memory.jsHeapSizeLimit / 1048576)}MB`
        : null,

      // Ağ
      connectionType: conn?.effectiveType ?? null,
      downlink: conn?.downlink ? `${conn.downlink} Mbps` : null,
      rtt: conn?.rtt ? `${conn.rtt}ms` : null,

      // Performans
      pageLoadMs: navEntry ? Math.round(navEntry.loadEventEnd - navEntry.startTime) : null,
      domInteractiveMs: navEntry ? Math.round(navEntry.domInteractive - navEntry.startTime) : null,

      // Discord / Session
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
      fd.append('sessionInfo', JSON.stringify(sessionInfo));
      fd.append('errorLog', JSON.stringify(errorLog));
      if (imageFile) fd.append('image', imageFile);

      const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(apiUrl('/api/support/bug-report'), { method: 'POST', headers, body: fd });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setTimeout(onClose, 2000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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

        <div className="px-6 pt-6 pb-6 flex flex-col gap-5">
          {/* Başlık */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/20">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-red-400">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Hata Bildir</h2>
              <p className="text-xs text-white/40">Oturum logları otomatik eklenecek</p>
            </div>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">Rapor gönderildi, teşekkürler!</p>
            </div>
          ) : (
            <>
              {/* Açıklama */}
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

              {/* Görsel yükleme */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ekran Görüntüsü <span className="text-white/25 normal-case">(isteğe bağlı)</span></label>
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="relative cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/3 hover:bg-white/5 hover:border-white/25 transition flex items-center justify-center min-h-[80px] overflow-hidden"
                >
                  {imagePreview ? (
                    <div className="relative w-full">
                      <img src={imagePreview} alt="preview" className="w-full max-h-40 object-contain rounded-xl" />
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

              {/* Otomatik log bilgisi */}
              <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/3 px-3 py-2">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#5865F2] flex-shrink-0">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" />
                </svg>
                <span className="text-xs text-white/35">URL, ekran boyutu, tarayıcı bilgisi ve oturum hata logları otomatik eklenir.</span>
              </div>

              {status === 'error' && (
                <p className="text-xs text-red-400 text-center">Gönderim başarısız, tekrar dene.</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!description.trim() || status === 'sending'}
                className="w-full rounded-xl border border-white/10 bg-white/8 py-2.5 text-sm font-semibold text-white hover:bg-white/12 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {status === 'sending' ? (
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
        </div>
      </div>
    </div>
  );
}
