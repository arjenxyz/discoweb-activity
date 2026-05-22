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
function extractFilePath(stack?: string): string | null {
  if (!stack) return null;
  // Örnek Stack: "Error: blabla\n at Object.GET (C:\Users\...\route.ts:45:12)"
  const match = stack.match(/\((.*?\.(ts|tsx|js|jsx)):\d+:\d+\)/);
  if (match && match[1]) {
    // Sadece projenin kök dizininden sonrasını almak için temizleme yapabiliriz
    // Şimdilik ham yolu kaydediyoruz, AI zaten bunu okuyacak.
    return match[1];
  }
  return null;
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
      const filePath = extractFilePath(stack);

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
