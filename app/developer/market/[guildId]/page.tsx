'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface SuggestedAction {
  type: string;
  label: string;
  payload: Record<string, unknown>;
}

interface AnalysisResult {
  analysis: string;
  suggested_actions: SuggestedAction[];
}

export default function DeveloperGuildDetailPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [applying, setApplying] = useState<number | null>(null);
  const [applyResults, setApplyResults] = useState<Record<number, string>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const analyze = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setApplyResults({});
    try {
      const res = await fetch('/api/developer/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, prompt }),
      });
      const data = await res.json();
      if (data.error) {
        setResult({ analysis: `Hata: ${data.error}`, suggested_actions: [] });
      } else {
        setResult(data);
      }
    } catch {
      setResult({ analysis: 'İstek başarısız oldu.', suggested_actions: [] });
    } finally {
      setLoading(false);
    }
  };

  const applyAction = async (index: number, action: SuggestedAction) => {
    setApplying(index);
    try {
      const res = await fetch('/api/developer/apply-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: action.type, payload: action.payload }),
      });
      const data = await res.json();
      if (data.error) {
        setApplyResults(prev => ({ ...prev, [index]: `Hata: ${data.error}` }));
      } else {
        setApplyResults(prev => ({ ...prev, [index]: '✅ Uygulandı' }));
        if (data.remaining !== undefined) setRemaining(data.remaining);
      }
    } catch {
      setApplyResults(prev => ({ ...prev, [index]: 'İstek başarısız' }));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/developer/market" className="text-gray-400 hover:text-white text-sm">← Listelere Dön</Link>
          <h1 className="text-xl font-bold mt-1 font-mono">{guildId}</h1>
        </div>
        {remaining !== null && (
          <span className="text-sm text-gray-400">Kalan günlük limit: <span className="text-white font-bold">{remaining}</span></span>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">AI Asistana Sor</label>
        <textarea
          ref={promptRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) analyze(); }}
          rows={3}
          className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-sm text-white resize-none focus:outline-none focus:border-blue-500"
          placeholder="Bu sunucu için ne yapmalıyım? Fiyat çok düşüyor, ne önerirsin? (Ctrl+Enter ile gönder)"
        />
        <button
          onClick={analyze}
          disabled={loading || !prompt.trim()}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {loading ? 'Analiz ediliyor...' : 'Analiz Et'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Analiz</h2>
            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{result.analysis}</p>
          </div>

          {result.suggested_actions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Önerilen Aksiyonlar</h2>
              <div className="space-y-3">
                {result.suggested_actions.map((action, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
                          action.type === 'market_event' ? 'bg-blue-900 text-blue-300' :
                          action.type === 'market_penalty' ? 'bg-red-900 text-red-300' :
                          'bg-purple-900 text-purple-300'
                        }`}>{action.type}</span>
                        <span className="text-sm text-white">{action.label}</span>
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Payload göster</summary>
                          <pre className="text-xs text-gray-400 mt-1 bg-gray-900 p-2 rounded overflow-x-auto">{JSON.stringify(action.payload, null, 2)}</pre>
                        </details>
                      </div>
                      <div className="flex-shrink-0">
                        {applyResults[i] ? (
                          <span className={`text-xs ${applyResults[i].startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{applyResults[i]}</span>
                        ) : (
                          <button
                            onClick={() => applyAction(i, action)}
                            disabled={applying !== null}
                            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-xs font-medium transition-colors"
                          >
                            {applying === i ? 'Uygulanıyor...' : 'Uygula'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
