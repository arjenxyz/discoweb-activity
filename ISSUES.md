# Activity Web — Hata & Eksiklik Takip Listesi

> Bu dosya projedeki bilinen sorunları, eksiklikleri ve iyileştirme önerilerini takip etmek için kullanılır.
> Yeni sorunlar bulundukça buraya eklenir. Her düzeltme sonrası ilgili satır `[x]` ile işaretlenir.

---

## 🔴 KRİTİK

- [x] **STORE-1** — `app/api/member/store/route.ts` — Rol assign + wallet deduct race condition. Rollback başarısız olunca `rollback_failed` statüsüyle kaydediliyor, kullanıcıya bildirim maili gönderiliyor.
- [x] **STORE-2** — `app/api/member/store/route.ts:265` — `wallet.balance` null kontrolü eklendi, `Number(wallet.balance ?? 0)` ile güvenli hesaplama yapılıyor.
- [x] **AUTH-1** — `components/DiscordActivityAuth.tsx:165` — Guild değişince `window.location.reload()` ile sayfa yenileniyor, eski data gösterilmiyor.
- [x] **API-1** — `app/api/promotion/use/route.ts` — `.single()` → `.maybeSingle()` + null check eklendi.
- [x] **API-2** — `app/api/activity/dev-session/route.ts` — `ENABLE_DEV_SESSION` env bypass kaldırıldı, sadece `NODE_ENV === 'development'` kabul ediliyor.
- [x] **API-3** — `lib/discordRest.ts` — `AbortController` ile 10sn timeout eklendi.

---

## 🟠 YÜKSEK

- [x] **DASH-1** — `app/dashboard/page.tsx:39` — `setLoading` eklendi, `/api/notifications` fetch eden useEffect yazıldı. Bildirimler artık yükleniyor.
- [x] **AUTH-2** — `app/api/auth/refresh/route.ts:23` — 30 günden eski expired token'lar artık reddediliyor (`token_too_old` 401).
- [x] **DISCORD-1** — `app/api/discord/guilds/route.ts:35` — Bot token eksikse artık `missing_bot_token` 500 hata dönüyor, sessiz boş liste yok.
- [x] **DISCORD-2** — `app/api/discord/guilds/route.ts` — Seri loop yerine max 5 paralel batch kontrolü yapılıyor, 429 alınırsa `Retry-After` bekleniyor.
- [x] **MW-1** — `middleware.ts:107` — 404 kontrolü grace period öncesine taşındı, atılan kullanıcı anında /server-left'e yönlendiriliyor, cache temizleniyor.
- [x] **OVERVIEW-1** — `app/api/member/overview/route.ts:163` — Leaderboard concurrency 30→5 düşürüldü. Boş username için `userId.slice(0,8)+'...'` fallback eklendi.
- [x] **API-4** — `app/api/member/coupons/route.ts` — `userId` null check eklendi, anonim kullanıcıya 401 dönüyor.
- [x] **API-5** — `app/api/member/profile/route.ts` — Discord fetch'lerine AbortController 10sn timeout eklendi. Fetch başarısız olursa `roles: []` dönüyor (mevcut davranış korundu).
- [x] **API-6** — Hardcoded guild ID `'1465698764453838882'` tüm dosyalardan kaldırıldı (13 dosya). Fallback `null` olarak güncellendi.

---

## 🟡 ORTA

- [x] **MAIL-1** — `app/dashboard/page.tsx:284` — Hata anında mevcut liste korunuyor, banner gösteriliyor. Encoding hatası da düzeltildi.
- [x] **STORE-3** — `app/api/member/store/route.ts:194` — `Number(item.price ?? 0)` guard eklendi, NaN/negatif fiyat kontrolü var.
- [x] **STORE-4** — `app/dashboard/page.tsx` — `mailInserted: false` gelirse kullanıcıya "(Bildirim maili gönderilemedi)" gösteriliyor.
- [x] **PROFILE-1** — `app/dashboard/components/ActivityReadinessGate.tsx` — `if (creatingProfile) return;` guard eklendi, çift tıklama koruması var.
- [x] **WALLET-1** — `app/api/member/wallet/route.ts:79` — Wallet upsert hatası artık yakalanıyor, `wallet_init_failed` 500 dönüyor.
- [x] **API-7** — `app/api/member/purchase/route.ts` — `failure_response: respText` kaldırıldı, DB'ye sadece `failure_code` (status kodu) yazılıyor.
- [x] **API-8** — `app/api/activity/readiness/route.ts` — `checkMaintenance` kontrolü eklendi.
- [x] **API-9** — `app/api/member/overview/route.ts` — Discord fetch'e AbortController 10sn timeout eklendi. Fetch başarısız olursa `hasVerifyRole` için DB'den `has_tag` fallback kullanılıyor.

---

## 🔵 DÜŞÜK / UX

- [x] **UX-1** — `app/dashboard/page.tsx:757` — Tüm hata mesajları Türkçe ve açıklayıcı şekilde yeniden yazıldı. Encoding bozuklukları düzeltildi.
- [ ] **UX-2** — `lib/api.ts:3` — `NEXT_PUBLIC_API_BASE_URL` undefined olursa path direkt `/api/...` dönüyor. Yanlış host'a gidebilir, 404.
- [x] **UX-3** — `app/api/member/store/route.ts` — Rollback başarısız olursa kullanıcıya `rollback_failed` mesajı gösteriliyor, UI'da "yönetici bilgilendirildi" yazıyor.
- [ ] **API-10** — Üretim kodunda aşırı `console.log` var (`guilds/route.ts`, `store/route.ts` vb.). Production build'de bundle'a dahil oluyor, performans etkisi küçük ama log temizliği gerekli.

---

## 🔒 GÜVENLİK

- [ ] **SEC-1** — `lib/auth.ts:93` — CSRF token `httpOnly: false`. XSS saldırısında CSRF token çalınabilir.
- [ ] **SEC-2** — `middleware.ts:206` — Embed request'te userId bulunamazsa `NextResponse.next()` ile devam ediyor. Auth olmadan dashboard erişimi mümkün olabiliyor.
- [ ] **SEC-3** — `next.config.ts:14` — CSP'de `data:` ve `blob:` açık. Data URL injection riski.
- [x] **SEC-4** — `app/api/activity/dev-session/route.ts` — API-2 ile birlikte düzeltildi. `ENABLE_DEV_SESSION` bypass kaldırıldı.

---

## 💡 İYİLEŞTİRME ÖNERİLERİ

- [x] **IMP-1** — `/api/discord/guilds` — Paralel batch kontrolü yapılıyor (max 5).
- [ ] **IMP-2** — `/api/activity/readiness` — Kullanıcı bazlı kısa süreli cache (30sn). Şu an her render'da 2 Discord API çağrısı gidiyor.
- [ ] **IMP-3** — Store satın alma — Sipariş tablosuna idempotency key ekle, aynı sepet çift gönderilirse duplicate order oluşmasın.
- [x] **IMP-4** — Mail fetch hatası — Hata anında mevcut liste korunuyor.
- [x] **IMP-5** — Leaderboard — `userId.slice(0,8)` fallback eklendi.
- [x] **IMP-6** — Hardcoded ID'ler kaldırıldı (API-6 ile birlikte).
- [x] **IMP-7** — `lib/discordRest.ts` — AbortController timeout eklendi (API-3 ile birlikte).

---

## ✅ TAMAMLANDI

- [x] **READINESS-1** — `app/api/activity/readiness/route.ts` — `fetchWithRetry` 429 handling eklendi, `Retry-After` header'a göre bekleme yapılıyor.
- [x] **READINESS-2** — `app/api/activity/readiness/route.ts` — `resolveGuildAdminFromOAuth` sunucu kontrolünden sonraya taşındı, gereksiz Discord API çağrısı kaldırıldı.
- [x] **STORE-1** — Rollback başarısız → `rollback_failed` statüsü + kullanıcı maili.
- [x] **STORE-2** — `wallet.balance` null safety.
- [x] **STORE-3** — `item.price` NaN guard.
- [x] **STORE-4** — Mail başarısız → UI'da bildirim.
- [x] **AUTH-1** — Guild değişince sayfa yenileniyor.
- [x] **AUTH-2** — 30 günden eski token reddediliyor.
- [x] **DASH-1** — Notification fetch + loading state düzeltildi.
- [x] **DISCORD-1** — Bot token eksik → açık hata dönüyor.
- [x] **DISCORD-2** — Guild kontrolleri paralel batch + 429 handling.
- [x] **MAIL-1** — Hata anında liste korunuyor, encoding düzeltildi.
- [x] **OVERVIEW-1** — Leaderboard concurrency 30→5, username fallback.
- [x] **PROFILE-1** — Çift tıklama koruması.
- [x] **WALLET-1** — Wallet init hata handling.
- [x] **UX-1** — Tüm hata mesajları Türkçe + encoding düzeltildi.
- [x] **UX-3** — Rollback hata mesajı kullanıcıya gösteriliyor.

---

_Son güncelleme: 2026-03-20 (6. oturum — MW-1, API-5, API-9 tamamlandı)_
