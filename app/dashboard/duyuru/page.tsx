'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
      const response = await fetch(apiUrl(`/api/duyuru?lang=${t('locale')}`));
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Mesajlar yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDeveloperStatus = async () => {
    try {
      const token = localStorage.getItem('discord_bearer_token');
      console.log('Token found:', !!token);
      if (!token) return;

      const response = await fetch(apiUrl('/api/activity/is-developer'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Developer check response status:', response.status);
      const data = await response.json();
      console.log('Developer check data:', data);
      setIsDeveloper(!!data.isDeveloper);
    } catch (err) {
      console.error('Developer kontrolü hatası:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('discord_bearer_token');
      if (!token) {
        setError('Yetkilendirme gerekli');
        return;
      }

      const response = await fetch(apiUrl('/api/duyuru'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ title: '', body: '' });
        setShowForm(false);
        await loadMessages(); // Mesajları yeniden yükle
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Mesaj gönderilemedi');
      }
    } catch (err) {
      console.error('Mesaj gönderme hatası:', err);
      setError('Mesaj gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(t('locale') === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-4"></div>
          <div className="h-32 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Duyuru</h1>
        {isDeveloper && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? 'İptal' : 'Yeni Duyuru'}
          </button>
        )}
      </div>

      {isDeveloper && showForm && (
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">Yeni Duyuru Gönder</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Başlık
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                placeholder="Duyuru başlığı..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Mesaj
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 min-h-[100px] resize-y"
                placeholder="Duyuru içeriği..."
                required
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting ? 'Gönderiliyor...' : 'Gönder'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">Henüz duyuru mesajı yok.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-start gap-3">
                {message.author_avatar_url && (
                  <Image
                    src={message.author_avatar_url}
                    alt={message.author_name || 'Developer'}
                    width={40}
                    height={40}
                    className="rounded-full flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{message.title}</h3>
                    <span className="text-xs text-white/50">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  {message.author_name && (
                    <p className="text-sm text-blue-400 mb-2">{message.author_name}</p>
                  )}
                  <div
                    className="text-white/90 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.body.replace(/\n/g, '<br>') }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}