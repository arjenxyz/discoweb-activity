import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

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

// Anahtarları virgülle ayrılmış string'den diziye çevirir
function parseKeys(envValue?: string): string[] {
  if (!envValue) return [];
  return envValue.split(',').map(k => k.trim()).filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const isDev = await checkIsDeveloper(request);
    if (!isDev) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { logId, errorTitle, filePath, stackTrace } = await request.json();
    if (!filePath) {
      return NextResponse.json({ error: 'Dosya yolu eksik.' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json({ error: 'GITHUB_TOKEN bulunamadı. Lütfen çevre değişkenlerine ekleyin.' }, { status: 500 });
    }

    // GitHub'dan dosya içeriğini çek
    const repoOwner = 'arjenxyz';
    const repoName = 'discoweb-activity';
    
    // Windows vs Linux formatındaki filePath'leri (app\api\...) GitHub uyumlu hale (app/api/...) getir
    const ghFilePath = filePath.replace(/\\/g, '/');

    let fileContent = '';
    let fileSha = '';
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${ghFilePath}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json'
        },
        // Vercel cache'i engellemek için
        cache: 'no-store'
      });

      if (!ghRes.ok) {
        throw new Error(`GitHub API Hatası: ${ghRes.status} ${ghRes.statusText}`);
      }

      const ghData = await ghRes.json();
      fileSha = ghData.sha; // Push işlemi için SHA gereklidir
      fileContent = Buffer.from(ghData.content, 'base64').toString('utf8');
    } catch (e: any) {
      return NextResponse.json({ error: `GitHub'dan dosya okunamadı (${ghFilePath}): ` + e.message }, { status: 404 });
    }

    const prompt = `
Aşağıdaki TypeScript/Next.js dosyasında bir hata meydana geldi.
Hata Başlığı: ${errorTitle}
Hata Detayı (Stack Trace):
${stackTrace || 'Bilinmiyor'}

Lütfen hatanın nedenini tespit et ve DOSYANIN TAMAMINI güncelleyerek bana GERİ VER.
Döndürdüğün kod, doğrudan dosyanın üzerine yazılacağı için açıklamaları veya yorumları kod bloğunun dışına ÇIKARMA. SADECE kodu geri döndür! 
Kod bloklarını markdown olarak (örneğin \`\`\`tsx ... \`\`\`) işaretleyebilirsin, onları temizleyip alacağım.

Dosya İçeriği:
\`\`\`typescript
${fileContent}
\`\`\`
`;

    // 1. Sağlayıcı (Provider) Anahtarlarını Topla
    const providers: { name: string; key: string }[] = [];

    // OpenAI Anahtarları (Birden fazla olabilir)
    const openaiKeys = parseKeys(process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY);
    openaiKeys.forEach(k => providers.push({ name: 'openai', key: k }));

    // Gemini Anahtarları (Birden fazla olabilir)
    const geminiKeys = parseKeys(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
    geminiKeys.forEach(k => providers.push({ name: 'gemini', key: k }));

    if (providers.length === 0) {
      return NextResponse.json({ 
        error: 'Sistemde geçerli bir yapay zeka API anahtarı bulunamadı. Lütfen .env.local dosyasına OPENAI_API_KEY veya GEMINI_API_KEY ekleyin.' 
      }, { status: 500 });
    }

    let aiResponse = '';
    let lastError = null;
    let successfulProvider = '';

    // 2. Sağlayıcıları Sırayla Dene (Cross-Provider Fallback)
    for (const provider of providers) {
      try {
        console.log(`[AI-FIX] ${provider.name} ile düzeltme deneniyor...`);

        if (provider.name === 'openai') {
          const openai = new OpenAI({ apiKey: provider.key });
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Ücretsiz tier için mini model çok daha hızlı ve ucuzdur. Gerekirse gpt-4o yapılabilir.
            messages: [
              { role: "system", content: "Sen kıdemli bir TypeScript ve Next.js geliştiricisisin. Koddaki hatayı çözüp dosyanın tamamını geri döndürürsün." },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
          });
          aiResponse = completion.choices[0]?.message?.content || '';
        } 
        else if (provider.name === 'gemini') {
          const ai = new GoogleGenAI({ apiKey: provider.key });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: "Sen kıdemli bir TypeScript ve Next.js geliştiricisisin. Koddaki hatayı çözüp dosyanın tamamını geri döndürürsün.",
              temperature: 0.2,
            }
          });
          aiResponse = response.text || '';
        }

        // Eğer geçerli bir yanıt aldıysak döngüden çık
        if (aiResponse) {
          successfulProvider = provider.name;
          break;
        }
      } catch (err: any) {
        console.warn(`[AI-FIX] ${provider.name} başarısız oldu. Hata:`, err.message);
        lastError = err;
        // Limit bitmişse veya hata varsa sıradaki provider'a/anahtara geç
        continue;
      }
    }

    if (!aiResponse) {
      throw new Error(`Tüm yapay zeka sağlayıcıları (OpenAI, Gemini) tükendi veya başarısız oldu. Son Hata: ${lastError?.message || 'Bilinmiyor'}`);
    }

    // 3. Markdown'ı Temizle (Sadece kodu al)
    let fixedCode = aiResponse;
    const match = fixedCode.match(/```(?:typescript|tsx|ts|javascript|js)?\n([\s\S]*?)\n```/);
    if (match && match[1]) {
      fixedCode = match[1];
    }

    // 4. Sabit diske yazma işlemi iptal edildi. AI'dan gelen kod arayüze döndürülüyor.
    // Kullanıcı arayüzde onayladıktan sonra github-commit API'sine gidip GitHub'a pushlanacak.

    return NextResponse.json({ 
      success: true, 
      fixedCode,
      fileSha,
      provider: successfulProvider,
      message: `Dosya başarıyla ${successfulProvider.toUpperCase()} tarafından düzeltildi. Onay bekleniyor...` 
    });

  } catch (error: any) {
    console.error("AI Fix Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
