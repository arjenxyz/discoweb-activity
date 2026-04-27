'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LocaleContext';
import { apiUrl } from '@/lib/api';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'not_found' | 'need_info' | 'planned_next' | 'long_term' | 'duplicate' | 'invalid';

type Report = {
  id: string;
  type: string;
  section: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

type Props = { onClose: () => void; section?: string };

const STATUS_CONFIG: Record<ReportStatus, { labelKey: string; subKey: string; color: string; dot: string; icon: string }> = {
  pending: {
    labelKey: 'support_status_pending_label',
    subKey: 'support_suggestion_status_pending_sub',
    color: 'border-white/10 bg-white/5',
    dot: 'bg-white/30',
    icon: '⏳',
  },
  reviewing: {
    labelKey: 'support_status_reviewing_label',
    subKey: 'support_suggestion_status_reviewing_sub',
    color: 'border-violet-500/30 bg-violet-500/10',
    dot: 'bg-violet-400',
    icon: '🔍',
  },
  need_info: {
    labelKey: 'support_suggestion_status_need_info_label',
    subKey: 'support_suggestion_status_need_info_sub',
    color: 'border-blue-500/30 bg-blue-500/10',
    dot: 'bg-blue-400',
    icon: '💬',
  },
  planned_next: {
    labelKey: 'support_suggestion_status_planned_next_label',
    subKey: 'support_suggestion_status_planned_next_sub',
    color: 'border-cyan-500/30 bg-cyan-500/10',
    dot: 'bg-cyan-400',
    icon: '🎯',
  },
  long_term: {
    labelKey: 'support_suggestion_status_long_term_label',
    subKey: 'support_suggestion_status_long_term_sub',
    color: 'border-purple-500/30 bg-purple-500/10',
    dot: 'bg-purple-400',
    icon: '⏳',
  },
  resolved: {
    labelKey: 'support_suggestion_status_resolved_label',
    subKey: 'support_suggestion_status_resolved_sub',
    color: 'border-green-500/30 bg-green-500/10',
    dot: 'bg-green-400',
    icon: '✅',
  },
  not_found: {
    labelKey: 'support_suggestion_status_not_found_label',
    subKey: 'support_suggestion_status_not_found_sub',
    color: 'border-red-500/20 bg-red-500/5',
    dot: 'bg-red-400',
    icon: '❌',
  },
  duplicate: {
    labelKey: 'support_suggestion_status_duplicate_label',
    subKey: 'support_suggestion_status_duplicate_sub',
    color: 'border-white/10 bg-white/5',
    dot: 'bg-white/40',
    icon: '🔁',
  },
  invalid: {
    labelKey: 'support_suggestion_status_invalid_label',
    subKey: 'support_suggestion_status_invalid_sub',
    color: 'border-white/10 bg-white/5',
    dot: 'bg-white/20',
    icon: '🚫',
  },
};

function authHeaders(): HeadersInit {
  try {
    const token = localStorage.getItem('discord_bearer_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

export default function SuggestionModal({ onClose, section }: Props) {
  const t = useT();
  const [tab, setTab] = useState<'new' | 'list'>('new');

  // --- New suggestion state ---
  const [title, setTitle] = useState('');
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

  // Poll active report
  useEffect(() => {
    if (!activeReportId) return;
    const poll = async () => {
      try {
        const res = await fetch(apiUrl(`/api/support/bug-report/status?id=${activeReportId}`), { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json() as { status: ReportStatus };
        setActiveReportStatus(data.status);
        if (data.status === 'resolved' || data.status === 'not_found') {
          if (pollRef.current) clearInterval(pollRef.current as ReturnType<typeof setInterval>);
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current as ReturnType<typeof setInterval>); };
  }, [activeReportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/support/bug-report/my-reports?type=suggestion'), { headers: authHeaders() });
      if (res.ok) setReports((await res.json() as Report[]).filter(r => r.type === 'suggestion'));
    } catch { /* ignore */ }
    setReportsLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'list') loadReports();
  }, [tab, loadReports]);

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
    try {
      const fd = new FormData();
      fd.append('description', title.trim() ? `**${title.trim()}**\n\n${description}` : description);
      fd.append('type', 'suggestion');
      if (section) fd.append('section', section);
      fd.append('sessionInfo', JSON.stringify({}));
      fd.append('errorLog', JSON.stringify([]));
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

  const cfg = STATUS_CONFIG[activeReportStatus];

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0d12]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

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
          {/* Header */}
          <div className="flex items-center gap-3 pr-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/20 flex-shrink-0">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-violet-400">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm3.75-1.5a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5zm0 3a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{t('support_suggestion_title')}</h2>
              <p className="text-xs text-white/40">{t('support_suggestion_subtitle')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
            <button type="button" onClick={() => setTab('new')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === 'new' ? 'bg-violet-500/15 text-violet-300' : 'text-white/40 hover:text-white/70'}`}>
              {t('support_suggestion_tab_new')}
            </button>
            <button type="button" onClick={() => setTab('list')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${tab === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              {t('support_suggestion_tab_list')}
            </button>
          </div>

          {/* ── TAB: Öneri Gönder ── */}
          {tab === 'new' && (
            <>
              {sendStatus === 'success' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-3 py-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20">
                      <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-white">{t('support_suggestion_success_title')}</p>
                    <p className="text-xs text-white/40">{t('support_suggestion_success_subtitle')}</p>
                  </div>

                  <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors ${cfg.color}`}>
                    <span className="text-lg leading-none mt-0.5">{cfg.icon}</span>
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="text-sm font-semibold text-white">{t(cfg.labelKey)}</span>
                      <span className="text-xs text-white/50">{t(cfg.subKey)}</span>
                    </div>
                    {activeReportStatus === 'reviewing' && (
                      <svg className="h-4 w-4 animate-spin text-violet-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                        <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>

                  {activeReportStatus === 'not_found' && (
                    <button type="button" onClick={() => window.open('https://discord.gg/vxK95JTFPw', '_blank', 'noopener,noreferrer')}
                      className="w-full rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 py-2.5 text-sm font-semibold text-[#5865F2] hover:bg-[#5865F2]/20 transition flex items-center justify-center gap-2">
                      {t('support_discord_button')}
                    </button>
                  )}

                  <button type="button"
                    onClick={() => { setSendStatus('idle'); setTitle(''); setDescription(''); setImageFile(null); setImagePreview(null); setActiveReportId(null); }}
                    className="text-xs text-white/30 hover:text-white/60 transition text-center">
                    {t('support_suggestion_submit_new')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t('support_suggestion_title_label')} <span className="text-white/25 normal-case">{t('support_suggestion_title_optional')}</span></label>
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={t('support_suggestion_title_placeholder')}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t('support_suggestion_description_label')}</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder={t('support_suggestion_description_placeholder')}
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t('support_image_label')} <span className="text-white/25 normal-case">{t('support_screenshot_optional')}</span></label>
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
                        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                          <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-white/25">
                            <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
                          </svg>
                          <span className="text-xs text-white/30">{t('support_screenshot_drop')}</span>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); }} />
                  </div>

                  {sendStatus === 'error' && (
                    <p className="text-xs text-red-400 text-center">{t('support_send_error')}</p>
                  )}

                  <button type="button" onClick={handleSubmit}
                    disabled={!description.trim() || sendStatus === 'sending'}
                    className="w-full rounded-xl border border-violet-500/20 bg-violet-500/10 py-2.5 text-sm font-semibold text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2">
                    {sendStatus === 'sending' ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                          <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {t('support_sending')}
                      </>
                    ) : t('support_suggestion_submit')}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── TAB: Önerilerim ── */}
          {tab === 'list' && (
            <>
              {selectedReport ? (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => setSelectedReport(null)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition w-fit">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" />
                    </svg>
                    {t('support_back')}
                  </button>

                  {(() => {
                    const c = STATUS_CONFIG[selectedReport.status];
                    return (
                      <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${c.color}`}>
                        <span className="text-xl leading-none mt-0.5">{c.icon}</span>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-sm font-bold text-white">{t(c.labelKey)}</span>
                          <span className="text-xs text-white/50">{t(c.subKey)}</span>
                        </div>
                        {selectedReport.status === 'reviewing' && (
                          <svg className="h-4 w-4 animate-spin text-violet-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                            <path d="M8 2a6 6 0 016 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                    );
                  })()}

                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{t('support_suggestion_meta_id')}</span>
                      <span className="text-xs font-mono text-white/70">{selectedReport.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40">{t('support_meta_created')}</span>
                      <span className="text-xs text-white/70">{new Date(selectedReport.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                    {selectedReport.updated_at !== selectedReport.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">{t('support_meta_updated')}</span>
                        <span className="text-xs text-white/70">{new Date(selectedReport.updated_at).toLocaleString('tr-TR')}</span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">{t('support_suggestion_report_label')}</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>

                  {selectedReport.status === 'not_found' && (
                    <button type="button" onClick={() => window.open('https://discord.gg/vxK95JTFPw', '_blank', 'noopener,noreferrer')}
                      className="w-full rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 py-2.5 text-sm font-semibold text-[#5865F2] hover:bg-[#5865F2]/20 transition flex items-center justify-center gap-2">
                      {t('support_discord_button')}
                    </button>
                  )}
                </div>
              ) : (
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
                        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm3.75-1.5a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5zm0 3a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" />
                      </svg>
                      <p className="text-sm text-white/30">{t('support_suggestion_empty')}</p>
                    </div>
                  ) : (
                    <>
                      {reports.map(r => {
                        const c = STATUS_CONFIG[r.status];
                        return (
                          <button key={r.id} type="button" onClick={() => setSelectedReport(r)}
                            className="w-full flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2.5 text-left transition group">
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${c.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 truncate leading-tight">{r.description}</p>
                              <p className="text-[11px] text-white/30 mt-0.5">{new Date(r.created_at).toLocaleDateString('tr-TR')} · #{r.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                              r.status === 'reviewing' ? 'text-violet-400 border-violet-500/30 bg-violet-500/10' :
                              r.status === 'resolved'  ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                              r.status === 'not_found' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                              'text-white/40 border-white/10 bg-white/5'
                            }`}>{t(c.labelKey)}</span>
                            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white/20 group-hover:text-white/50 transition flex-shrink-0">
                              <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06L7.28 11.78a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" />
                            </svg>
                          </button>
                        );
                      })}
                      <button type="button" onClick={loadReports} className="text-xs text-white/25 hover:text-white/50 transition text-center pt-1">{t('support_refresh')}</button>
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
