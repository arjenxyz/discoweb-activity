import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseServiceClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Log once on the server so we can see missing env vars in logs.
    console.error('[supabase] missing required env vars', {
      supabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
