'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { apiUrl } from '@/lib/api';

interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
}

export default function ServerLeftPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(apiUrl('/api/auth/me'), { credentials: 'include', cache: 'no-store' });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Kullanıcı Avatarı */}
        <div className="mb-6">
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt={user.username}
              width={80}
              height={80}
              className="rounded-full mx-auto border-4 border-slate-200"
            />
          ) : (
            <div className="w-20 h-20 bg-slate-300 rounded-full mx-auto flex items-center justify-center border-4 border-slate-200">
              <span className="text-2xl font-bold text-slate-600">
                {user?.username?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Kullanıcı Adı */}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {user?.username || 'Kullanıcı'}
        </h1>

        {/* Durum Başlığı */}
        <div className="mb-6">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Sunucudan Ayrıldınız
          </div>
        </div>

        {/* Ana Mesaj */}
        <div className="text-slate-600 mb-8 space-y-4">
          <p className="text-lg leading-relaxed">
            Seçili sunucudan ayrıldığınız için bu sunucunun içeriklerine erişiminiz kısıtlanmıştır.
          </p>
          <p className="text-base leading-relaxed">
            Eğer bu sunucunun mağaza, cüzdan ve diğer özelliklerine erişmek istiyorsanız,
            sunucuya geri dönmeniz gerekmektedir.
          </p>
        </div>

        {/* Aksiyon Butonları */}
        <div className="space-y-3">
          <Link
            href="/auth/select-server"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Sunucu Seçimine Dön
          </Link>

          <Link
            href="/"
            className="block w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Ana Sayfa
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Sorularınız için destek ekibimizle iletişime geçebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
