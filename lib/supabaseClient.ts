import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Supabase env eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    return null;
  }

  const normalizedSupabaseUrl = (() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if ((host.includes('discordsays.com') || host.includes('discordapp.com')) && supabaseUrl.startsWith('/supabase-storage')) {
        return `https://dotmvirtfyepdpcvgucc.supabase.co${supabaseUrl}`;
      }
    }
    return supabaseUrl;
  })();

  supabaseClient = createClient(normalizedSupabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
};
