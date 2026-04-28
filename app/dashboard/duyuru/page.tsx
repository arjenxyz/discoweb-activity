'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { apiUrl } from '@/lib/api';

interface DuyuruMessage {
  id: string;
  title: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
}

export default function DuyuruPage() {
  const t = useT();
  const [messages, setMessages] = useState<DuyuruMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMessages();
    checkDeveloperStatus();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await fetch(apiUrl(`/api/duyuru?lang=${t('locale')}`));
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkDeveloperStatus = async () => {
    try {
      const token = localStorage.getItem('discord_bearer_token');
      if (!token) return;
      const res = await fetch(apiUrl('/api/activity/is-developer'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setIsDeveloper(!!data.isDeveloper);
    } catch (err) {
      console.error('Developer kontrol hatası:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('discord_bearer_token');
      const res = await fetch(apiUrl('/api/duyuru'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ title: '', body: '' });
        setShowForm(false);
        await loadMessages();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Bir hata oluştu');
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(t('locale') === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-800 rounded-xl p-6">
            <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-700 rounded w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Başlık alanı */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">📢 Duyurular</h1>
            <p className="text-gray-400 mt-1">Güncellemeler, haberler ve duyurular</p>
          </div>
          {isDeveloper && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-medium rounded-xl shadow-lg transition-all duration-200"
            >
              {showForm ? '✕ Vazgeç' : '＋ Yeni Duyuru'}
            </button>
          )}
        </div>

        {/* Yeni duyuru formu (gelişmiş animasyonlu) */}
        {showForm && (
          <div className="mb-8 p-6 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-100">Yeni Duyuru Gönder</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Başlık
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
                  placeholder="Başlık..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  İçerik
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition min-h-[120px] resize-y"
                  placeholder="Duyuru içeriği..."
                  required
                />
              </div>
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl transition"
                >
                  {submitting ? 'Gönderiliyor...' : 'Yayınla'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Duyuru listesi */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-800">
              <p className="text-gray-400 text-lg">Henüz duyuru yok.</p>
              <p className="text-gray-500 text-sm mt-1">Yeni duyurular burada görünecek.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className="group bg-gray-800/70 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/50 transition-all shadow-lg"
              >
                <div className="flex items-start gap-4">
                  {message.author_avatar_url ? (
                    <img
                      src={message.author_avatar_url}
                      alt={message.author_name || 'Developer'}
                      className="w-10 h-10 rounded-full ring-2 ring-gray-600"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                      S
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-100">{message.title}</h3>
                      <time className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(message.created_at)}
                      </time>
                    </div>
                    {message.author_name && (
                      <p className="text-sm text-indigo-400 font-medium mb-3">— {message.author_name}</p>
                    )}
                    <div className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                      {/* DON'T use dangerouslySetInnerHTML – use pre-wrap instead */}
                      {message.body}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}