import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';
const DEV_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';

// Güvenlik: Kullanıcının geliştirici olup olmadığını kontrol et
async function checkIsDeveloper(request: Request): Promise<boolean> {
  const auth = await requireSessionUser(request);
  if (!auth.ok) return false;
  if (DEV_USER_ID && auth.userId === DEV_USER_ID) return true;
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) return false;
  
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  
  try {
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${auth.userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const member = await res.json() as { roles?: string[] };
    return Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
  } catch {
    return false;
  }
}

// Supabase yetkili client (status değiştirmek için)
const getAdminSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  try {
    const isDev = await checkIsDeveloper(request);
    if (!isDev) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { logId, errorTitle } = await request.json();
    const safeTitle = (errorTitle || 'Unknown Error').replace(/"/g, '\\"');
    const commitMessage = `🪄 AI Fix: ${safeTitle}`;

    // Git komutlarını çalıştır
    // Not: Bu işlem sunucusuz ortamlarda (Vercel) değil, fiziksel/sanal makinelerde (VPS, Local) çalışır.
    await execAsync('git add .');
    await execAsync(`git commit -m "${commitMessage}"`);
    await execAsync('git push origin main');

    // Veritabanında hatayı 'resolved' (çözüldü) olarak işaretle
    try {
      const supabase = getAdminSupabase();
      if (supabase && logId) {
        await supabase
          .from('error_logs')
          .update({ status: 'resolved' })
          .eq('id', logId);
      }
    } catch (e) {
      console.warn("Could not update log status in DB:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Değişiklikler başarıyla kaydedildi ve Github deposuna gönderildi.' 
    });

  } catch (error: any) {
    console.error("Git Commit Error:", error);
    
    // Klasör git deposu değilse veya push yetkisi yoksa kullanıcıyı bilgilendir
    const errorString = String(error.message || error);
    let friendlyMessage = 'Git işleminde bir hata oluştu.';
    
    if (errorString.includes('not a git repository')) {
      friendlyMessage = 'Bu klasör bir Git deposu değil.';
    } else if (errorString.includes('Authentication failed') || errorString.includes('Permission denied')) {
      friendlyMessage = 'GitHub push yetkisi bulunamadı. Lütfen SSH veya Token ayarlarınızı kontrol edin.';
    } else if (errorString.includes('nothing to commit')) {
      friendlyMessage = 'Değişiklik bulunamadı veya AI düzeltme yapmadı.';
    }

    return NextResponse.json({ 
      error: friendlyMessage, 
      details: errorString 
    }, { status: 500 });
  }
}
