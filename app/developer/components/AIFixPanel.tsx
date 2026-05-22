import React, { useState } from 'react';
import { LuWand, LuCheck, LuLoader, LuGithub } from 'react-icons/lu';

type AIFixPanelProps = {
  logId: string;
  errorTitle: string;
  filePath?: string;
  stackTrace?: string;
};

export default function AIFixPanel({ logId, errorTitle, filePath, stackTrace }: AIFixPanelProps) {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'fixed' | 'committing' | 'done' | 'error'>('idle');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [fileSha, setFileSha] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAiFix = async () => {
    if (!filePath) {
      setErrorMessage("Dosya yolu (file_path) bulunamadı. Bu hata otomatik çözülemez.");
      setStatus('error');
      return;
    }

    setStatus('analyzing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/developer/ai-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, errorTitle, filePath, stackTrace })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Analiz Hatası');

      setAiResponse(data.fixedCode || data.explanation);
      setFileSha(data.fileSha);
      setStatus('fixed');
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  const handleCommit = async () => {
    setStatus('committing');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/developer/git-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          logId, 
          errorTitle, 
          filePath, 
          fixedCode: aiResponse, 
          fileSha 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Git Commit Hatası');

      setStatus('done');
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  if (!filePath && status === 'idle') return null; // Dosya yolu yoksa AI butonu gösterme

  return (
    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
          <LuWand className="h-4 w-4" /> Otonom AI Çözücü
        </h3>
        
        {status === 'idle' && (
          <button
            onClick={handleAiFix}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <LuWand className="h-3.5 w-3.5" /> AI İle Çöz
          </button>
        )}
      </div>

      {status === 'analyzing' && (
        <div className="flex items-center gap-3 text-emerald-300/70 text-sm">
          <LuLoader className="h-4 w-4 animate-spin" /> Yapay Zeka kodu inceliyor ve çözümü uyguluyor...
        </div>
      )}

      {status === 'committing' && (
        <div className="flex items-center gap-3 text-blue-300/70 text-sm">
          <LuLoader className="h-4 w-4 animate-spin" /> Değişiklikler GitHub'a pushlanıyor...
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
          ⚠️ Hata: {errorMessage}
        </div>
      )}

      {status === 'fixed' && aiResponse && (
        <div className="space-y-3">
          <div className="rounded-lg bg-black/40 p-3 max-h-[250px] overflow-y-auto text-[11px] text-white/70 border border-white/10 font-mono whitespace-pre-wrap">
            {aiResponse}
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
            <button
              onClick={handleCommit}
              className="flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2 text-xs font-bold text-white transition shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <LuGithub className="h-4 w-4" /> Onayla ve Github'a Pushla
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-medium text-white/70 transition"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="flex flex-col items-center justify-center py-4 text-emerald-400 space-y-2">
          <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <LuCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-sm font-bold">Harika! Hata çözüldü ve GitHub'a pushlandı.</p>
        </div>
      )}
    </div>
  );
}
