# Mari Ekonomi Sistemi — Tasarım Defteri

> Tüm kararlar netleşti. Kod öncesi son kontrol için bu dosya referans alınacak.

---

## 1. Para Birimleri

### Papel (Yerel)
- Sunucu içi para, bot ile kazanılır
- Her sunucunun kendi papel ekonomisi ve daily cap'i var
- **Mevcut sistem değişmiyor** — buna dokunmuyoruz

### Mari (MRI) — Global Rezerv
- Borsada tek geçer para birimi
- Transfer edilemez (kullanıcıdan kullanıcıya gönderilemez)
- Kasılamaz — sadece papel → Mari dönüşümüyle edinilir
- **Developer override yetkisine sahip** (DB'den elle müdahale edebilir)

---

## 2. Papel → Mari Dönüşüm Kurları ✅

### Formül
```
mari_rate = daily_cap / 2
(1 Mari kaç papel eder)

Örnek:
  Daily cap = 1.000 papel → 1 Mari = 500 papel
  Daily cap = 10.000 papel → 1 Mari = 5.000 papel

Oyuncu günlük limiti tam doldurursa: her zaman 2 Mari kazanır.
```

### Override
- DB'de `servers.mari_rate_override` sütunu
- `NULL` ise formül çalışır, dolu ise override değeri kullanılır
- Sadece developer erişir

### Güvenlik: Minimum Emek Çapası
Mari dönüşümü için papel yetmez — **o gün sunucuda gerçekten aktif olunması lazım:**
- Günde en az **50 geçerli mesaj** VEYA sesli kanalda **30+ dakika**
- Bu şartı karşılamayanlar papel kazanır ama Mari'ye dönüştüremez
- "Geçerli mesaj" = cooldown geçmiş mesaj (bot zaten sayıyor)

### Kilitlenme Kuralı
Yüksek ekonomi başvurusu onaylandıktan sonra:
- `daily_cap` değiştirilemez
- `mari_rate` formülle sabitlenir
- Değiştirmek isteyenler developer'a başvurur

### Admin Paneli Uyarısı (Başvuru Öncesi)
- "Üyelerinizin günlük limiti doldurmak için gereken aktivite: X mesaj/gün"
- "Bu çok zor / çok kolay görünüyor — başvurmadan önce düzenleyin"
- Onaydan sonra değiştirilemez uyarısı

---

## 3. Günlük Global Mari Limiti ✅

- **Sunucu başına:** Günlük max **2 Mari**
- **Global (tüm sunucular):** Günlük max **6 Mari** (= 3 sunucudan tam limit)
- Viral etki: oyuncular farklı sunuculara girerek max kazanmaya çalışır → bot yayılır

---

## 4. Borsa Başlangıç (V2 Geçişi) ✅

### Sıfırlama
- Mevcut borsa tamamen sıfırlanır (eski papel fiyatlar geçersiz)
- Yeni IPO'lar 0.25 – 1.00 MRI bandından başlar

### Airdrop (V1 → V2 Telafisi)
Eski sistemdeki **toplam servet** = `wallet_balance + (lot_count × eski_market_price)` tüm holdingleri dahil.

| Tier | Eski Servet | Airdrop |
|------|------------|---------|
| 1 — Küçük Yatırımcı | 10.000 – 100.000 papel | 5 MRI |
| 2 — Orta Direk | 100.000 – 500.000 papel | 10 MRI |
| 3 — Balina (Hard Cap) | 500.000+ papel | 20 MRI |

> Servet ne kadar büyük olursa olsun max 20 MRI — V2'yi ilk günden tekele almayı engeller.

**10.000 papel altı oyuncular:** 1 MRI "Hoş Geldin Bonusu" alır.
→ Soğuk başlangıcı önler, herkesi borsaya dahil eder.

---

## 5. Aktivite Bazlı Fiyat Mekanizması ✅

### Referans Noktası (Baseline)
Her sunucu için: **Son 7 günlük mesaj ortalaması**

### Fiyat Değişim Formülü
```
delta = ((bugün_mesaj / baseline) - 1) × 15%
delta = clamp(delta, -15%, +15%)

Örnekler (baseline = 1.000 mesaj/gün):
  0 mesaj    → delta = -15% (ölü gün)
  500 mesaj  → delta = -7.5%
  1.000 mesaj → delta = 0% (normal gün)
  1.500 mesaj → delta = +7.5%
  2.000+ mesaj → delta = +15% (tavanlandı)
```

### Diğer Faktörler (ağırlıklı)
| Sinyal | Ağırlık |
|--------|---------|
| Mesaj sayısı (yukarıdaki formül) | %50 |
| Aktif kanal çeşitliliği | %20 |
| Ses kanalı dakikası | %20 |
| Üye delta (kazanım/kayıp) | %10 |

### Güncelleme Zamanı
- Günlük batch: gece 00:00
- Anlık küçük dalgalanma: ±%1–3 (büyük trade'lerde, market event'lerde)

---

## 6. IPO Sistemi ✅

### Temel Kurallar
- IPO fiyatı **kesinlikle Mari cinsinden** girilir
- Admin `/ipo-schedule` ile tarih/saat + tier yapısını belirler
- Activity'de geri sayım sayacı
- IPO saatinde ilk tier açılır

### Aşamalı Satış (Tiered Sale) — YAPILIYOR
```
Örnek IPO yapısı:
  Tier 1: İlk 200 lot @ 0.50 MRI  (hızla kapılır → hype)
  Tier 2: Sonraki 300 lot @ 0.75 MRI
  Tier 3: Kalan 500 lot @ 1.00 MRI

Her tier dolunca sonraki otomatik açılır.
```

### DB Değişikliği
`server_listings.ipo_price` (tek fiyat) → `ipo_tiers` tablosu:
```sql
CREATE TABLE ipo_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES server_listings(id),
  tier_order INTEGER NOT NULL,       -- 1, 2, 3...
  lot_count INTEGER NOT NULL,        -- bu tier'daki lot sayısı
  price_per_lot DECIMAL(18,6) NOT NULL, -- Mari cinsinden
  sold_lots INTEGER DEFAULT 0,
  opened_at TIMESTAMPTZ,
  UNIQUE(listing_id, tier_order)
);
```

---

## 7. Circuit Breaker — KALDIRILDI ✅

- Mevcut `circuit_breaker_until` mantığı kaldırılıyor
- Pump & dump oyunun bir özelliği, engellenmeyecek
- Fiyat serbest düşebilir, oyuncular bunu stratejik kullanabilir
- **Tek kalan limit:** Aktivite bazlı günlük ±%15 (bu alış-satış değil, aktivite etkisi)

**Developer Acil Freni (ekleniyor):** `global_settings.market_halted = true` yapılınca tüm alış-satış durur.
Oyuncular görmez, hiçbir otomatik tetikleyici yok — sadece developer elle açar/kapatır.
Mevcut `checkGlobalFreeze()` mekanizmasına entegre edilir, yeni bir şey değil.

---

## 8. Oyuncu İflası ✅
Özel bir mekanizma yok. Kaybedince papel kas, geri dön.

---

## 9. Bekleyen Kararlar

Tüm kararlar netleşti. ✅

---

## 11. Yüksek Ekonomi Başvuru Sistemi

### Setup'ta Değişiklik
- Eski: Setup sırasında "Yüksek Ekonomi" seçeneği vardı
- **Yeni: Setup'ta bu seçenek yok.** Herkes standart ekonomiyle başlar.

### Başvuru Yolları

#### Yol A — Ön Başvuru (Oylama ile)
- Sunucu içinde **100 aktif oy** toplanması gerekir
- Oylar Activity üzerinden verilir (bot komutuyla değil)
- **Yeni hesap koruması:** Discord hesabı X günden (öneri: 30 gün) daha genç olan kullanıcıların oyu sayılmaz
- 100 oya ulaşınca başvuru otomatik oluşur → developer incelemesine gider

#### Yol B — Direkt Başvuru
- Sunucunun **500+ üyesi** olması gerekir
- Admin `/ekonomi-basvur` komutuyla direkt başvurur
- Developer incelemesine gider

### Başvuru Durumları (Activity Borsa Sayfası)

Yüksek ekonomiye geçmemiş sunucular borsa sayfasında şu durumları gösterir:

```
┌─────────────────────────────────────────┐
│  📊 Papel Piyasası                      │
│                                         │
│  Bu sunucu henüz Yüksek Ekonomiye       │
│  geçmedi.                               │
│                                         │
│  Durum: [DURUM BADGE]                   │
│                                         │
│  [Başvur / Oy ver butonu]               │
└─────────────────────────────────────────┘
```

| Durum | Badge | Açıklama |
|-------|-------|----------|
| `none` | 🔴 Başvuru Yok | "Sunucunuz henüz başvurmadı. Oy toplayın veya direkt başvurun." |
| `voting` | 🟡 Oylama Devam Ediyor | "X/100 oy toplandı. Activity'den oy verin!" |
| `pending` | 🔵 İnceleniyor | "Başvurunuz alındı, inceleniyor." |
| `approved` | 🟢 Kabul Edildi | "Açılış tarihi: DD.MM.YYYY HH:MM" |
| `rejected` | ⛔ Reddedildi | "Başvurunuz reddedildi. Sebep: [sebep]" |

### DB Tablosu
```sql
CREATE TABLE economy_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'none',
    -- 'none' | 'voting' | 'pending' | 'approved' | 'rejected'
  application_type VARCHAR(20), -- 'vote' | 'direct'
  vote_count INTEGER DEFAULT 0,
  vote_threshold INTEGER DEFAULT 100,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,            -- developer Discord ID
  rejection_reason TEXT,
  scheduled_open_at TIMESTAMPTZ NOT NULL, -- başvuru anında otomatik set edilir (başvuru + 7 gün)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE economy_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  discord_account_age_days INTEGER, -- kayıt anında hesaplanır
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  is_valid BOOLEAN DEFAULT true,    -- 30 günden genç = false
  UNIQUE(guild_id, user_id)
);
```

### Onay & Otomatik Aktivasyon

**Başvuru gönderilince:**
- `status = 'pending'`
- `scheduled_open_at = NOW() + 7 gün` (otomatik)
- Activity'de gösterilir: "İnceleniyor — Tahmini açılış: DD.MM.YYYY"

**Developer müdahalesi (opsiyonel, 7 gün içinde):**
- ✅ Erken onay → `scheduled_open_at` istenirse öne alınabilir
- ❌ Red → `status = 'rejected'`, `rejection_reason` girilir

**7 gün dolunca developer onaylamamışsa:**
- Sistem otomatik `status = 'approved'` yapar (cron job)
- Sunucu yüksek ekonomiye açılır

> Yani developer sadece **reddetmek** için müdahale eder. Onay = varsayılan.

### Oy Geçerlilik Kuralı
```
Hesap yaşı = bugün - Discord kayıt tarihi
Geçerli oy: hesap_yaşı >= 30 gün
Geçersiz oy: kaydedilir ama vote_count'a eklenmez (şeffaflık için)
```

---

## 12. Mari Dönüştürme — Activity UI

### Temel Kural
- Dönüştürme **herhangi bir sunucudaki Activity'den** yapılabilir
- Kullanıcı hangi sunucudaysa o sunucunun kuru kullanılır
- Dönüştürülen Mari global hesapta birikar

### Sayfa Tasarımı (Activity içinde ayrı sekme veya modal)

```
┌──────────────────────────────────────────────┐
│  💱  Papel → Mari Dönüştürme                 │
│                                              │
│  Sunucu Kuru                                 │
│  ┌──────────────────────────────────────┐    │
│  │  DiscoWeb                            │    │
│  │  1 MRI = 500 Papel                   │    │
│  │  Günlük limitin: 2 MRI               │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Papel Bakiyen:  10.000 P                    │
│  Mari Bakiyen:   1.25 MRI                    │
│  Bugün dönüştürdün: 0.50 MRI / 2 MRI        │
│  Global kalan:   4.50 MRI / 6 MRI            │
│                                              │
│  Dönüştürmek istediğin Papel:                │
│  ┌─────────────────────┐                     │
│  │  1.000              │  [MAX]              │
│  └─────────────────────┘                     │
│                                              │
│  Alacaksın: ≈ 2.00 MRI                      │
│                                              │
│  ⚠️ Bugün bu sunucudan en fazla 2 MRI        │
│  dönüştürebilirsin.                          │
│                                              │
│  [  Dönüştür  ]                              │
│                                              │
│  Minimum emek şartı: ✅ 63 mesaj atıldı      │
│                       (min. 50 gerekli)      │
└──────────────────────────────────────────────┘
```

### Dönüştürme Akışı
1. Kullanıcı miktar girer
2. Sistem kontrol eder:
   - Yeterli papel bakiyesi var mı?
   - Günlük sunucu limiti (2 MRI) aşılıyor mu?
   - Global limit (6 MRI) aşılıyor mu?
   - Minimum emek şartı (50 mesaj / 30 dk ses) karşılandı mı?
3. Hepsi geçerliyse: papel düşülür, mari_balance artar, `mari_conversions` loglanır

### API Endpoint
`POST /api/member/mari-convert`
```ts
Body: { papel_amount: number }
Response: { ok: true, mari_gained: number, new_mari_balance: number }
Errors: 'insufficient_papel' | 'daily_server_limit' | 'global_daily_limit' | 'min_activity_required'
```

---

## 10. Onaylanan Kararlar Özeti

| Karar | Değer |
|-------|-------|
| Mari kur formülü | `daily_cap / 2` |
| Sunucu başı günlük max Mari | 2 MRI |
| Global günlük max Mari | 6 MRI |
| Min emek çapası | 50 mesaj VEYA 30 dk ses |
| IPO fiyat birimi | Mari (MRI) |
| IPO yapısı | Aşamalı (Tiered Sale) |
| IPO fiyat bandı | 0.25 – 1.00 MRI |
| Aktivite etkisi | ±%15/gün, 7 günlük baseline |
| Circuit breaker | KALDIRILDI |
| Borsa geçişi | Sıfırlama + Airdrop |
| Airdrop max | 20 MRI |
| 10k papel altı | 1 MRI hoş geldin bonusu |
| Developer acil fren | `market_halted` flag, checkGlobalFreeze'e entegre |
