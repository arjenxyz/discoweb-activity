import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase yetkili client (veritabanına yazmak için)
const getAdminSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

/**
 * Hata yığınından (stack trace) dosya yolunu (file path) ayıklamaya çalışır
 */
function extractFilePath(stack?: string, reqUrl?: string): string | null {
  let filePath: string | null = null;
  
  if (stack) {
    const match = stack.match(/\((.*?\.(ts|tsx|js|jsx)):\d+:\d+\)/);
    if (match && match[1]) {
      filePath = match[1];
    }
  }

  // Vercel ortamında orijinal dosya yolu gizlenir (Örn: /var/task/.next/server/chunks/...)
  // Bu durumda Request URL üzerinden orijinal dosyayı tersine mühendislikle (Reverse Routing) tahmin ediyoruz.
  if (!filePath || filePath.includes('/var/task/') || filePath.includes('.next/server/')) {
    if (reqUrl) {
      try {
        const parsed = new URL(reqUrl);
        let pathname = parsed.pathname;

        // Varsa /activity/api önekini /api olarak düzelt (next.config.ts rewrites)
        if (pathname.startsWith('/activity/api/')) {
          pathname = pathname.replace('/activity/api/', '/api/');
        }

        // URL'ye göre dosya yolu tahmini
        if (pathname.startsWith('/api/')) {
          if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
          filePath = `app${pathname}/route.ts`;
        } else {
          if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
          filePath = `app${pathname === '/' ? '' : pathname}/page.tsx`;
        }
      } catch (e) {
        console.warn('URL parse error:', e);
      }
    }
  }

  return filePath;
}

/**
 * API route'ları için sarmalayıcı (wrapper).
 * Kullanım:
 * export const GET = withErrorHandler(async (req) => { ... });
 */
export function withErrorHandler(handler: (req: Request, ...args: any[]) => Promise<Response>) {
  return async (req: Request, ...args: any[]): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (error: any) {
      console.error('🔥 API Error Captured:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const filePath = extractFilePath(stack, req.url);

      try {
        const supabase = getAdminSupabase();
        if (supabase) {
          // Supabase'e logla (Yapay zeka sistemi için)
          await supabase.from('error_logs').insert({
            code: error?.code || 'INTERNAL_ERROR',
            title: 'API Route Exception',
            severity: 'high',
            category: 'api',
            context: {
              url: req.url,
              method: req.method,
              stack: stack,
            },
            file_path: filePath,
            status: 'open',
          });
        }
      } catch (dbError) {
        console.error('🚨 Hata veritabanına kaydedilemedi:', dbError);
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: errorMessage },
        { status: 500 }
      );
    }
  };
}
