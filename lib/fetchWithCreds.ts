import { apiUrl } from './api';

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.*+?^${}()|[\\]\\])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

export default async function fetchWithCreds(input: RequestInfo, init: RequestInit = {}) {
  const resolvedInput =
    typeof input === 'string' && input.startsWith('/api/') ? apiUrl(input) : input;

  // If we're in an Activity embed environment, we may not have cookies sent.
  // In that case, include the selected guild id as a query parameter so the backend
  // can still determine the proper guild.
  let finalInput = resolvedInput;
  if (typeof window !== 'undefined' && typeof resolvedInput === 'string') {
    const selectedGuildId = window.localStorage.getItem('selectedGuildId');
    if (selectedGuildId) {
      // Handle both relative paths (/api/...) and full URLs (https://.../api/...)
      let url: URL | null = null;
      if (resolvedInput.startsWith('/api/')) {
        url = new URL(resolvedInput, window.location.origin);
      } else {
        try {
          const parsed = new URL(resolvedInput);
          if (parsed.pathname.startsWith('/api/')) {
            url = parsed;
          }
        } catch {
          // Not a valid URL, ignore
        }
      }

      if (url && !url.searchParams.has('guild_id')) {
        url.searchParams.set('guild_id', selectedGuildId);
        finalInput = url.toString();
      }
    }
  }

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

  const response = await fetch(finalInput, merged);

  // If token has expired, try refreshing it once and repeat the request.
  if (response.status === 401 && bearerToken) {
    try {
      const refreshResponse = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json().catch(() => null);
        const newBearer = refreshData?.bearerToken;
        if (newBearer) {
          localStorage.setItem('discord_bearer_token', newBearer);

          const retryResponse = await fetch(finalInput, {
            ...merged,
            headers: {
              ...(merged.headers || {}),
              Authorization: `Bearer ${newBearer}`,
            },
          });
          return retryResponse;
        }
      }
    } catch {
      // ignore refresh failures, fallback to original 401
    }
  }

  return response;
}
