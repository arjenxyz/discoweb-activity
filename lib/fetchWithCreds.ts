import { apiUrl } from './api';

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.*+?^${}()|[\\]\\])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

export default async function fetchWithCreds(input: RequestInfo, init: RequestInit = {}) {
  const resolvedInput =
    typeof input === 'string' && input.startsWith('/api/') ? apiUrl(input) : input;

  const bearerTokenFromLocalStorage = typeof window !== 'undefined' ? localStorage.getItem('discord_bearer_token') : null;
  const bearerTokenFromCookie = typeof window !== 'undefined' ? getCookie('discord_session') : null;
  const bearerToken = bearerTokenFromLocalStorage || bearerTokenFromCookie;

  if (typeof window !== 'undefined' && !bearerToken) {
    console.warn('[fetchWithCreds] no bearer token found in localStorage or cookies');
  }

  const merged: RequestInit = {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers || {}),
      'Accept': 'application/json',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
  };

  return fetch(resolvedInput, merged);
}
