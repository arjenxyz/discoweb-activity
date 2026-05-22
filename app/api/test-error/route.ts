import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/errorHandler';

// Bu uç nokta (endpoint) kasten sistem çökmelerine neden olmak ve
// AI Auto-Fix (Yapay Zeka Hata Çözücü) altyapısını test etmek içindir.

export const GET = withErrorHandler(async (request: Request) => {
  // TEST: Bilerek tanımsız bir değişkene ulaşmaya çalışıyoruz
  const user = undefined;
  
  // Aşağıdaki satır "TypeError: Cannot read properties of undefined" hatası fırlatacak.
  // @ts-ignore
  const userName = user.profile.name;

  return NextResponse.json({
    message: "Eğer bu mesajı görüyorsan, hata başarıyla çözülmüş demektir!",
    userName: userName
  });
});
