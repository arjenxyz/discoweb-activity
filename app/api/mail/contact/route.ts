import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

type Database = {
  public: {
    Tables: {
      system_mail_contacts: {
        Row: { guild_id: string; user_id: string; subject: string; message: string; created_at: string | null };
        Insert: { guild_id: string; user_id: string; subject: string; message: string; created_at?: string | null };
        Update: { guild_id?: string; user_id?: string; subject?: string; message?: string; created_at?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || process.env.DISCORD_GUILD_ID || null;
};

const getSupabase = (): SupabaseClient<Database> | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};


export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;

  const payload = (await request.json()) as { subject?: string; message?: string };
  const subject = payload.subject?.trim() ?? '';
  const message = payload.message?.trim() ?? '';

  if (!subject || !message) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const selectedGuildId = await getSelectedGuildId();

  const { error } = await supabase
    .from('system_mail_contacts')
    .insert({
      guild_id: selectedGuildId,
      user_id: userId,
      subject,
      message,
    });

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  return NextResponse.json({ status: 'ok' });
}
