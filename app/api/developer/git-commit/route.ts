import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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

    const { logId, errorTitle, filePath, fixedCode, fileSha } = await request.json();
    
    if (!filePath || !fixedCode || !fileSha) {
      return NextResponse.json({ error: 'Dosya yolu, kod veya SHA eksik.' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN bulunamadı. Lütfen çevre değişkenlerine ekleyin.' }, { status: 500 });
    }

    const safeTitle = (errorTitle || 'Unknown Error').replace(/"/g, '\\"');
    const commitMessage = `🪄 AI Fix: ${safeTitle}`;
    
    const repoOwner = 'arjenxyz';
    const repoName = 'discoweb-activity';
    const ghFilePath = filePath.replace(/\\/g, '/');

    // 1. Kodu Base64 formatına çevir (GitHub API zorunluluğu)
    const base64Content = Buffer.from(fixedCode, 'utf8').toString('base64');

    // 2. GitHub API üzerinden dosyayı güncelle (Direct Commit to Main)
    const ghRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${ghFilePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: fileSha,
        branch: 'main' // Doğrudan canlıya at
      })
    });

    if (!ghRes.ok) {
      const errorData = await ghRes.json();
      throw new Error(`GitHub Commit Hatası: ${errorData.message}`);
    }

    // 3. Veritabanında hatayı 'resolved' (çözüldü) olarak işaretle
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
      message: 'Değişiklikler başarıyla GitHub deposuna gönderildi ve canlı site güncelleniyor.' 
    });

  } catch (error: any) {
    console.error("GitHub Commit API Error:", error);
    return NextResponse.json({ 
      error: 'GitHub API işleminde hata oluştu.', 
      details: String(error.message || error) 
    }, { status: 500 });
  }
}
