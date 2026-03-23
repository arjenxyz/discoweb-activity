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

## 4. Borsa Başlangıç ✅

### Sıfırlama
- Yüksek Ekonomi'ye geçen sunucuda **tüm Papel bakiyeleri sıfırlanır**
- Mari bakiyeleri de sıfırdan başlar
- Herkes aynı noktadan başlar — geçmiş birikim avantaj sağlamaz
- Yeni IPO'lar 0.25 – 1.00 MRI bandından başlar

### Airdrop — KALDIRILDI ❌
Airdrop sistemi kaldırıldı. Gerekçe:
- Geçiş tarihi bilinince kullanıcılar kasıtlı Papel biriktirip sistemi manipüle eder
- "5 milyarlık adam" sorununu hard cap çözmez, koordineli farming ile atlatılır
- Mari'nin temeli zaten emek — airdrop bu prensiple çelişiyor

### Bireysel Opt-Out — YOK
- Yüksek Ekonomi geçişi sunucu genelinde geçerlidir, bireysel kaçış yolu yoktur
- Ancak **Mari dönüşümü ve borsa kullanımı her zaman isteğe bağlıdır**
- Kullanıcı sadece Papel kazanıp mağazayı kullanmaya devam edebilir

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
> Ön koşul: Sunucu `economy_tier = 'advanced'` olmadan IPO başvurusu açılmaz.
> Başvuru akışı için bkz. §13.

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

## 24. Eksik Detaylar & Düzeltmeler ✅

### 24.1 Platform Güvencesi (Delist Tazminatı)

**Senaryo:** Sunucu hazinesi tazminat ödemek için yetersiz.

```
1. Sunucu Mari hazinesi önce kullanılır
2. Yetmezse → DiscoWeb platform rezervinden tamamlanır
3. Platform bu maliyeti trade fee'sinden biriktirdiği %15 paydan karşılar
```

Bu çok düşük ihtimalli bir senaryo ama yatırımcı güveni için şart.
Platform güvencesi Activity'de "Tüm pozisyonlar güvence altındadır" olarak gösterilir.

---

### 24.2 Global Günlük Mari Sayacı

`mari_conversions` tablosu mevcut ama global limit kontrolü için ayrı bir sayaca ihtiyaç var.

```sql
CREATE TABLE mari_daily_global (
  date DATE PRIMARY KEY,
  total_converted DECIMAL(18,6) DEFAULT 0  -- o gün tüm kullanıcıların dönüştürdüğü
);
```

Günlük 6 MRI global limiti bu tablodan kontrol edilir.
Her gece 00:00 cron'u yeni satır açar (veya ilk dönüşümde oluşturulur).

---

### 24.3 Günlük Satış Limiti — Brüt Satış

Aynı gün alıp satma durumunda:
```
Brüt satış sayılır — net değil.

Örnek:
  Sabah 100 lot aldı, akşam 150 lot sattı
  Satış limiti: 150 lot sayılır (100 değil)
```

Daha basit, manipülasyonu zorlaştırır.
"Al-sat-al" döngüsüyle limiti atlatma kapısı kapanır.

---

### 24.4 Aktivite Sinyalleri — Normalize Formülü

Tüm sinyaller aynı mantıkla 7 günlük baseline'a göre normalize edilir:

```
sinyal_delta(x) = clamp(((bugün_x / baseline_x) - 1) × 15%, -15%, +15%)

Sinyaller:
  mesaj_delta      = sinyal_delta(mesaj_sayısı)        × 0.50
  kanal_delta      = sinyal_delta(aktif_kanal_sayısı)  × 0.20
  ses_delta        = sinyal_delta(ses_dakikası)        × 0.20
  üye_delta        = sinyal_delta(net_üye_değişimi)    × 0.10

toplam_delta = mesaj_delta + kanal_delta + ses_delta + üye_delta
new_price = yesterday_close × (1 + toplam_delta)
```

Baseline = son 7 günün ortalaması (bugün hariç).
Üye delta için baseline = son 7 günün ortalama günlük üye değişimi.
Eğer baseline sıfırsa (yeni listing) → o sinyal 0 delta üretir.

---

### 24.5 Hazine Satış Kademesi

Fiyat 30g MA'nın üzerine çıkınca hazine lotlarını kademeli satar:

```
Her gün (fiyat > 30g MA iken):
  günlük_satış = min(
    treasury_holdings × %5,      -- toplam hazine lotunun %5'i
    dolaşımdaki_lot × %1         -- piyasayı ezmemek için
  )

Satış anlık işlem olarak gerçekleşir (market fiyatından)
Gelir → server_mari_treasury.balance'a eklenir
```

Kademeli satış piyasayı boğmaz, hazine yavaşça boşaltılır.
Fiyat tekrar MA'nın altına düşerse satış durur.

---

### 24.6 Referral + IPO Etkileşimi

IPO alımlarında trade fee YOK → referral ödülü de YOK.
Referral sadece normal piyasa alımlarında çalışır.
Bu `referral_conversions` tablosundaki `trade_id`'nin `trade_type = 'buy'` olması şartıyla garanti altına alınır.

---

### 24.7 Delist Sonrası Yeniden Listeleme

```
server_listings tablosunda:
  status = 'delisted'
  delisted_at = timestamp

6 ay sonra yeniden başvuru:
  → Yeni ipo_applications kaydı açılır
  → Yeni server_listings kaydı oluşturulur (eskisi arşivde kalır)
  → Eski price_history arşivlenir (listing_id ile bağlı kalır)
  → Yatırımcıların eski pozisyonları zaten delist sırasında kapatılmıştır
```

---

### Ertelenmiş Özellikler (şimdilik yapılmıyor)
| Özellik | Durum | Koşul |
|---------|-------|-------|
| Limit emirler | ⏸️ Ertelendi | Activity tutarsa, geliştirme kararı alınırsa eklenir |

---

## 13. Başvuru Sistemi — İki Ayrı Katman

### Katman Ayrımı

| Katman | Ne için? | Ön koşul |
|--------|----------|----------|
| **Katman 1 — Yüksek Ekonomi** | Sunucunun advanced ekonomi kademesine geçmesi | Standart ekonomide olmak |
| **Katman 2 — Borsa** | Sunucunun borsada listelenmesi (IPO) | `economy_tier = 'advanced'` olmak |

Bu iki başvuru birbirinden tamamen bağımsızdır. Yüksek Ekonomi olmadan Borsa başvurusu açılmaz.

---

## 14. Katman 1 — Sol Sidebar: "Yüksek Ekonomi" Kategorisi

Standart ekonomideki sunucularda sol sidebar'da **"Yüksek Ekonomi"** başlığı altında iki menü öğesi:

### 14.1 "Başvur" Menüsü

#### Admin görünümü
- Başvuru formu açılır (bkz. §11)
- Mevcut başvuru varsa durum gösterilir

#### Normal kullanıcı görünümü
```
┌─────────────────────────────────────────────┐
│  🚀 Yüksek Ekonomi                          │
│                                             │
│  Bu sunucu henüz Yüksek Ekonomi             │
│  sistemine geçmedi.                         │
│                                             │
│  İlginizi adminlerinize iletmek için        │
│  oy verin!                                  │
│                                             │
│  ████████░░░░░░░░  47 / 100 oy             │
│                                             │
│  [  Oy Ver  ]                               │
│                                             │
│  💡 Adminler ilgi olsun olmasın her zaman   │
│     başvurabilir.                           │
└─────────────────────────────────────────────┘
```

**Oylama mekanizması notu:**
- Oylar tamamen **dekoratif / sosyal** — admini bilgilendirmek içindir
- Admin oy sayısından bağımsız, istediğinde başvurabilir
- Oy sayacı görsel motivasyon sağlar, topluluğu harekete geçirir
- Hesap yaşı koruması yine de geçerli (spam oylamayı önlemek için)

### 14.2 "Başvuru Detayları" Menüsü

Başvuru yapılmış sunucularda durum buradan takip edilir.

| Durum | Gösterim |
|-------|----------|
| `none` | Menü öğesi soluk — "henüz başvuru yok" |
| `pending` | 🔵 İnceleniyor — tahmini tarih + ilerleme çubuğu |
| `approved` | 🟢 Onaylandı — geçiş tarihi + "Tebrikler!" |
| `rejected` | 🔴 Reddedildi — sebep + yeni başvuru linki |

**Üyelere gösterilmeli mi?**
→ Evet, şeffaflık için gösterilmeli. Kullanıcı sunucunun başvuru sürecini görmeli.
Admin ve kullanıcı aynı sayfayı görür, sadece aksiyonlar (başvur butonu) admin'e özel.

### 14.3 Ek Fikirler (ilgi çekici olmak için)
> Bunlar kesinleşmeden önce tartışılacak, MD'ye not olarak alındı.

- **Destek rozeti**: Oy veren kullanıcıya "Erken Destekçi" rozeti (başvuru onaylanırsa verilir)
- **Geri sayım**: Başvuru onaylandıktan sonra geçiş tarihine kadar süre sayacı
- **Katılımcı sayısı**: "Bu sunucudan X kişi oy verdi" istatistiği
- **Bildirim**: Başvuru onaylandığında Activity üzerinden kullanıcılara bildirim

---

## 15. Katman 2 — Borsa Başvurusu

### 15.1 Erişim Koşulu

```
economy_tier = 'advanced' → Borsa sayfasında başvuru butonu görünür
economy_tier = 'basic'    → "Önce Yüksek Ekonomi gerekli" mesajı, buton YOK
```

- Kullanıcılar (admin olmayan) borsa başvuru alanını görmez — sadece borsa listesini görürler
- Oylama / ön başvuru / üye sayısı gibi akışlar **Borsa için YOK**

### 15.2 Borsa Sayfası — Admin Durumu Akışı

```
┌──────────────────────────────────────────────┐
│  📊 Borsa                                    │
│                                              │
│  [Durum: YE Aktif, başvuru yok]              │
│  ┌────────────────────────────────────────┐  │
│  │ Sunucunuz borsaya hazır!               │  │
│  │ IPO başvurusu yaparak sunucunuzu       │  │
│  │ yatırımcılara açın.                    │  │
│  │                                        │  │
│  │  [ Borsa Başvurusu Yap → ]             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Durum: pending]                            │
│  ┌────────────────────────────────────────┐  │
│  │ 🔵 Başvurunuz inceleniyor              │  │
│  │ Tahmini onay: DD.MM.YYYY              │  │
│  │ (7 gün içinde yanıt verilmezse        │  │
│  │  otomatik onaylanır)                  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Durum: rejected]                           │
│  ┌────────────────────────────────────────┐  │
│  │ ⛔ Başvurunuz reddedildi               │  │
│  │ Sebep: [sebep]                         │  │
│  │  [ Tekrar Başvur ]                     │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 15.3 Başvuru Ekranı — Alanlar ✅

| Alan | Zorunlu | Notlar |
|------|---------|--------|
| Sunucu kategorisi | ✅ | Seçim: Oyun / Sanat / Müzik / Eğitim / Topluluk / Kripto-Finans / Diğer |
| Kısa tanıtım metni | ✅ | Maks. 280 karakter — "Yatırımcılara ne sunuyorsunuz?" |
| Founder oranı | ✅ | 0.51–0.80 arası |
| Başlangıç fiyat önerisi | ✅ | 0.25–1.00 MRI (developer nihai fiyatı onayda belirler) |
| Aşamalı satış (tiered) yapısı | ✅ | bkz. §6 |
| Tahmini IPO tarihi | ❌ isteğe bağlı | 2 gün önce otomatik onay tetiklenir |
| Taahhüt onayı | ✅ | "Piyasayı yapay yollarla manipüle etmeyeceğimi, sunucumu aktif tutacağımı taahhüt ediyorum." |

**Otomatik kontrol (başvuru gönderilmeden önce):**
- Son 30 günde en az 500 geçerli mesaj şartı — karşılanmıyorsa başvuru açılmaz, uyarı gösterilir

**Toplam lot:** 1.000.000 — tüm sunucularda sabit, admin değiştiremez

### 15.4 Founder Vesting (Lock-up) ✅

**Süre:** 45 gün, kademeli açılım

| Gün | Bu adımda açılan | Toplam açık |
|-----|-----------------|-------------|
| 0–14 | — | %0 (tamamen kilitli) |
| Gün 15 | %25 | %25 |
| Gün 30 | %25 | %50 |
| Gün 45 | %50 | %100 |

- Kilitli lotlar borsa arayüzünde **görünür ama gri** — şeffaflık için
- Founder kilitli lotları satış emrine koyamaz
- Vesting gün 0 = IPO onay tarihi
- Cron job günlük kontrol ederek lotları açar (`founder_vested_lots` güncellenir)

### 15.4 Borsa Başvurusu DB

Mevcut `ipo_applications` tablosu kullanılır (bkz. §6).
`economy-tier-apply` değil, ayrı `ipo-apply` endpoint'i.

---

## 16. Borsa Kullanıcı Arayüzü — Tam Tasarım ✅

### 16.1 Borsa Ana Listesi

Tüm listelenmiş sunucular kart görünümünde. IPO aşamasındakiler ayrı "IPO" badge'iyle öne çıkar.

**Kart yapısı:**
```
┌──────────────────────────────────────────────┐
│  [İkon]  SunucuAdı              🎮 Oyun      │
│                                              │
│  0.847 MRI        ▲ +12.3%  (24s)           │
│                                              │
│  Piyasa Değeri: 847K MRI                    │
│  24s Hacim: 2.431 lot                        │
│  Aktivite: ████████░░  Yüksek               │
└──────────────────────────────────────────────┘
```

**Filtreler (üstte):**
- Kategori (Oyun / Sanat / Müzik / Eğitim / Topluluk / Kripto-Finans / Diğer)
- Sıralama: En çok yükselen · En çok düşen · Piyasa değeri · 24s hacim · Yeni listelenen

**Ayrı sekme: "Aktif IPO'lar"**
- IPO aşamasındaki sunucular burada — geri sayım + tier doluluk çubuğu
- Normal borsa listesinde de görünür ama badge'li

---

### 16.2 Sunucu Detay Sayfası — Layout

3 kolonlu yapı (mobilde tek kolon):

```
[Sol — Fiyat & İşlem]  [Orta — Grafik & İstatistik]  [Sağ — Sosyal & Aktivite]
```

---

#### 16.2.1 Sol Kolon — Fiyat & İşlem Paneli

```
┌──────────────────────────────────────┐
│  [İkon]  SunucuAdı                   │
│  🎮 Oyun  ·  Borsada 47 gündür       │
│                                      │
│  0.847 MRI                           │
│  ▲ +0.094 MRI  (+12.3%)  bugün       │
│  ▲ +28.1% son 7 gün                  │
├──────────────────────────────────────┤
│  AL                    SAT           │
│  ┌──────────────────────────────┐    │
│  │  Miktar (lot)                │    │
│  │  [        100        ] [MAX] │    │
│  │                              │    │
│  │  Maliyet:  84.70 MRI         │    │
│  │  Bakiyen:  12.45 MRI  ⚠️     │    │
│  │  (yetersiz — max 14 lot)     │    │
│  │                              │    │
│  │  [ ───── Satın Al ───── ]    │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Sat (elindeki: 250 lot)     │    │
│  │  [        100        ] [TÜM] │    │
│  │                              │    │
│  │  Alacaksın:  84.70 MRI       │    │
│  │                              │    │
│  │  [ ──────── Sat ─────── ]    │    │
│  └──────────────────────────────┘    │
├──────────────────────────────────────┤
│  💼 Pozisyonum                       │
│                                      │
│  250 lot  ·  Ort. alış: 0.712 MRI   │
│  Değer: 211.7 MRI                    │
│  Kâr/Zarar: +33.7 MRI (+18.9%) 🟢   │
│                                      │
│  [İşlem Geçmişim ↓]                 │
│  15.03  AL  150 lot @ 0.680 MRI     │
│  17.03  AL  100 lot @ 0.760 MRI     │
└──────────────────────────────────────┘
```

**İşlem kuralları:**
- Anlık işlem — piyasa fiyatından, bekleme yok
- Minimum işlem: 1 lot
- İşlem onayı: "X lot @ Y MRI = Z MRI" özeti gösterilir, kullanıcı onaylar
- Günde max işlem sayısı yok — serbest

---

#### 16.2.2 Orta Kolon — Grafik & Piyasa Verileri

**Fiyat grafiği:**
- Varsayılan: çizgi grafik, 7 günlük
- Zaman dilimleri: 1G · 7G · 30G · Tümü
- Mum grafik seçeneği (toggle)
- Fiyat geçmişi her gün gece kaydedilir (`price_history` tablosu)

**Piyasa istatistikleri:**
```
Piyasa Değeri      847.000 MRI
24s Hacim          2.431 lot  /  2.058 MRI
Dolaşımdaki Lot    490.000  (%49)
Toplam Lot         1.000.000
ATH                1.240 MRI  (12 gün önce)
ATL                0.250 MRI  (IPO günü)
```

**Lot dağılımı (görsel çubuk):**
```
Founder (kilitli) ▓▓▓▒▒░░░░░  255K lot  🔒 gün 30'da açılır
Founder (açık)    ▓▓▒░░░░░░░  255K lot  satılabilir
Halka açık        ▓▓▓▓▓░░░░░  490K lot
```

**Aktivite Baskısı (fiyat etkisi):**
```
⚡ Aktivite Baskısı — yarınki fiyatı etkiler

Mesaj aktivitesi  ████████░░  +8.2%  (%50 ağırlık)
Kanal çeşitliliği ██████░░░░  +4.1%  (%20 ağırlık)
Ses dakikası      ███████░░░  +5.8%  (%20 ağırlık)
Üye değişimi      ████░░░░░░  +1.2%  (%10 ağırlık)

Tahmini yarınki etki: ▲ +7.1%
(Baseline: 1.247 mesaj/gün · 7 günlük ort.)
```

> Aktivite Baskısı bilgilendiricidir — yatırımcıya sinyal verir,
> sunucu üyelerini aktif olmaya teşvik eder.

---

#### 16.2.3 Sağ Kolon — Sosyal & Topluluk Paneli

**Top 10 yatırımcı:**
```
👥 En Büyük Yatırımcılar

🥇  @kullanici1    45.200 lot   %9.2
🥈  @kullanici2    31.000 lot   %6.3
🥉  @kullanici3    18.400 lot   %3.7
4.  @kullanici4    12.100 lot   %2.5
5.  @kullanici5     9.800 lot   %2.0
...
[Sen: 15. sırada  250 lot  %0.05]
```

**Son işlemler (canlı feed):**
```
📋 Son İşlemler

▲ AL   @user4    500 lot   0.845 MRI   2dk önce
▼ SAT  @user2    200 lot   0.847 MRI   5dk önce
▲ AL   @user7   1.200 lot  0.840 MRI   8dk önce
▲ AL   @user1    300 lot   0.838 MRI  12dk önce
```
(son 20 işlem, sayfa yenilenince güncellenir)

**Sunucu bilgisi:**
```
ℹ️ Hakkında

Kategori:    🎮 Oyun
Kuruluş:     14 Mart 2024
Üye sayısı:  4.820
Borsada:     47 gündür
Founder:     @founder_user

"En büyük Türkçe Minecraft topluluğu,
günlük etkinlikler ve turnuvalar..."
```

---

### 16.3 IPO Sayfası — Ayrı Görünüm

IPO aşamasındaki sunucular için normal borsa sayfası değil, özel IPO sayfası gösterilir.

```
┌────────────────────────────────────────────────┐
│  🚀 IPO — SunucuAdı                            │
│                                                │
│  IPO başlıyor:  2G 14S 33DK  ⏳               │
│  (veya: IPO devam ediyor)                      │
├────────────────────────────────────────────────┤
│  Aşamalı Satış Durumu                          │
│                                                │
│  Tier 1  0.50 MRI  ████████████  DOLDU ✅     │
│          200 / 200 lot                         │
│                                                │
│  Tier 2  0.75 MRI  ███████░░░░░  %58          │
│          174 / 300 lot  ← aktif                │
│                                                │
│  Tier 3  1.00 MRI  ░░░░░░░░░░░░  bekliyor     │
│          0 / 500 lot                           │
├────────────────────────────────────────────────┤
│  Güncel IPO Fiyatı: 0.75 MRI / lot             │
│                                                │
│  [      100      ] lot  [MAX]                  │
│  Maliyet: 75.00 MRI                            │
│                                                │
│  [ ──── IPO'dan Lot Al ──── ]                  │
├────────────────────────────────────────────────┤
│  Sunucu bilgisi, aktivite, founder bilgisi     │
│  (detay sayfasıyla aynı sağ kolon)             │
└────────────────────────────────────────────────┘
```

**IPO kuralları:**
- Kullanıcı başına IPO'da max lot sınırı YOK — serbest piyasa
- Tüm tier'lar dolunca veya IPO tarihi geçince normal borsa sayfasına geçilir
- IPO sona erince kalan lotlar founder'a değil, piyasaya bırakılır (halka açık havuza girer)

---

### 16.4 Kişisel Portföy Sayfası

Sol sidebar'da ayrı menü öğesi — "Portföyüm"

```
┌────────────────────────────────────────────────┐
│  💼 Portföyüm                                  │
│                                                │
│  Toplam Değer:  1.247 MRI  ▲ +8.3% (7g)       │
│  Gerçekleşmiş K/Z:  +124.3 MRI  (tüm zamanlar)│
├────────────────────────────────────────────────┤
│  Pozisyonlarım                                 │
│                                                │
│  SunucuAdı1  250 lot  0.847 MRI               │
│  Değer: 211.7 MRI  ▲ +18.9%  [Al] [Sat]       │
│                                                │
│  SunucuAdı2  1.000 lot  0.312 MRI             │
│  Değer: 312.0 MRI  ▼ -5.2%   [Al] [Sat]       │
├────────────────────────────────────────────────┤
│  İşlem Geçmişi (tüm sunucular)                │
│                                                │
│  15.03  AL   SunucuAdı1  150 lot  @ 0.680     │
│  14.03  SAT  SunucuAdı2  500 lot  @ 0.340     │
│  12.03  AL   SunucuAdı2  1500 lot @ 0.290     │
└────────────────────────────────────────────────┘
```

---

---

## 17. Fiyat Taban Mekanizması ✅

### 17.1 İki Katmanlı Yapı

```
Katman 1 — Hazine Destek (aktif müdahale)
    ↓ rezerv tükenirse veya kalıcı düşüş
Katman 2 — Delist Eşiği (son güvenlik ağı)
```

---

### 17.2 Katman 1 — Hazine Destek Mekanizması

**Eşik (dinamik):**
```
Yeterli geçmiş varsa (≥30 gün):
  destek_eşiği = 30_günlük_MA × %60

Yeni listing (30 günden az):
  destek_eşiği = IPO_fiyatı × %30
```

30g MA tabanlı eşik, sabit orana göre çok daha sağlıklı —
sunucu büyüdükçe taban da gerçekçi kalır.

**Rezerv:**
- Sunucu hazinesinin **%15'i** destek fonuna ayrılır
- Günlük alım limiti: `min(dolaşımdaki_lot × %1, rezerv × %5)`
- Rezerv bitince hazine desteği durur, sistem Katman 2'ye geçer

**Tetiklenme koşulu (manipülasyon koruması):**
```
Hazine SADECE şu koşulda alım yapar:
  - Fiyat eşiğin altında VE
  - Son 3 gündür eşiğin altında (ani dip değil, kalıcı düşüş)

→ Koordineli "hazineyi tetikle-sonra dump et" manipülasyonu engellenir
```

**Hazine lotları:**
- Alınan lotlar `hazine_holdings` olarak tutulur (dolaşımdan çıkar)
- Fiyat 30g MA'nın üzerine çıkınca hazine bu lotları kademeli satar
- Satış geliri hazineye döner (sürdürülebilir döngü)

---

### 17.3 Katman 2 — Delist Eşiği

**Tetiklenme:**
```
delist_eşiği = IPO_fiyatı × %20

Koşul: fiyat 5 gün boyunca delist_eşiğinin altında kalırsa
→ Otomatik delist başlatılır (developer onayı gerekmez)
```

5 gün gecikme: geçici paniği filtreler, kalıcı çöküşü yakalar.

**Tazminat formülü:**
```
tazminat_per_lot = min(son_7g_ortalama_fiyat, delist_eşiği)
```
- Tazminat eşik fiyatından yüksek olamaz → delisti kâr fırsatına çevirme riski yok
- Son 7 günlük ortalama kullanılır → ani çöküş anındaki dip fiyatın kurbanı olunmaz

**Delist sonrası:**
1. Tüm açık pozisyonlar tazminat fiyatından kapatılır (hazineden ödenir)
2. `server_listings.status = 'delisted'`
3. Sunucu yeniden başvurabilir (6 ay bekleme süresi)
4. Yeniden listelemede IPO süreci baştan — geçmiş fiyat geçmişi arşivlenir

---

### 17.4 Günlük Satış Limiti (Koordineli Saldırı Koruması)

```
Kullanıcı başına günlük max satış: elindeki lotların %30'u
(alım serbest, limit yok)
```

- Büyük yatırımcının tek günde tüm pozisyonu kapatması engellenir
- Panik satışı yavaşlar, hazine daha az baskı görür
- Meşru çıkışa engel değil — 4 günde %100 çıkış yapılabilir
- Founder lock-up ile birlikte çalışır (kilitli lotlar bu hesaba dahil değil)

---

### 17.5 Parametre Özeti

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| Hazine destek eşiği | 30g MA × %60 (yeni: IPO × %30) | Dinamik taban |
| Hazine rezerv oranı | %15 | Hazine MRI'sinin bu kadarı ayrılır |
| Günlük alım limiti | min(%1 dolaşım, %5 rezerv) | Rezerv koruması |
| Hazine tetik gecikmesi | 3 gün | Manipülasyon koruması |
| Delist eşiği | IPO × %20 | Son güvenlik ağı |
| Delist tetik gecikmesi | 5 gün | Geçici panik filtresi |
| Tazminat | min(7g ort., delist eşiği) | Ters teşvik önleme |
| Yeniden listeleme bekleme | 6 ay | — |
| Günlük satış limiti | Pozisyonun %30'u | Koordineli dump koruması |

---

---

## 18. Hazine Sistemi — Tam Döngü ✅

Sistemde **iki ayrı hazine** var. Birbirine karışmamalı.

### 18.1 Papel Hazinesi (mevcut)

| | |
|--|--|
| **Para birimi** | Papel |
| **Giriş** | Mağaza satışlarının kesintisi |
| **Çıkış** | Referral ödemeleri |
| **Tablo** | `server_treasury` (mevcut) |

Yüksek Ekonomi geçişinde sıfırlanır — bkz. §4.

---

### 18.2 Mari Hazinesi (yeni — borsa için)

| | |
|--|--|
| **Para birimi** | Mari (MRI) |
| **Giriş** | Her alım/satım işleminden kesilen trade fee |
| **Çıkış** | Hazine destek alımları (§17), delist tazminatı (§17), temettü dağıtımı (§19) |
| **Tablo** | `server_mari_treasury` (yeni) |

---

### 18.3 Trade Fee Yapısı

Her işlemde iki taraf farklı ücret öder:

```
Alım:  %1.0 fee  (alıcı öder — toplam maliyet lot_sayısı × fiyat × 1.01)
Satım: %0.5 fee  (satıcı öder — alacağı miktar lot_sayısı × fiyat × 0.995)
```

Asimetrik yapı kasıtlı:
- Alım biraz pahalı → ani spekülasyonu hafif frenler
- Satım daha ucuz → uzun vadeli tutmak cezalandırılmaz
- IPO alımlarında fee YOK — giriş bariyeri olmasın

**Fee dağılımı:**

```
Her işlemin toplam fee'si:

  %60 → Sunucu Mari Hazinesi     (destek fonu + tazminat rezervi)
  %25 → Temettü Havuzu            (haftalık lot sahiplerine dağıtılır)
  %15 → Platform (DiscoWeb geliri)
```

**Örnek işlem:**
```
500 lot @ 0.847 MRI alım:
  Brüt maliyet:  423.50 MRI
  Fee (%1):        4.235 MRI

  Fee dağılımı:
    Sunucu hazinesi:  2.541 MRI  (%60)
    Temettü havuzu:   1.059 MRI  (%25)
    Platform:         0.635 MRI  (%15)

  Kullanıcının toplam ödemesi: 427.735 MRI
```

---

### 18.4 Döngü Diyagramı

```
Kullanıcı alım/satım
        ↓
    Trade Fee
    ┌───┴───────────┬──────────────┐
    ▼               ▼              ▼
Sunucu          Temettü        Platform
Hazinesi         Havuzu         Geliri
    │               │
    ├── Hazine       └── Haftalık
    │   destek           lot sahiplerine
    │   alımı            dağıtım
    │
    └── Delist
        tazminatı
```

---

### 18.5 Hazine Rezerv Kuralları

- Hazine bakiyesinin **%15'i** destek fonuna ayrılır (§17.2)
- Kalan **%85'i** tazminat rezervi olarak tutulur
- Hazine sıfırlanırsa: destek alımı durur, Katman 2 (delist) devreye girer
- Hazine bakiyesi borsa sayfasında **herkese görünür** — şeffaflık

---

### 18.6 DB

```sql
CREATE TABLE server_mari_treasury (
  guild_id TEXT PRIMARY KEY,
  balance DECIMAL(18,6) DEFAULT 0,        -- toplam Mari bakiyesi
  support_reserve DECIMAL(18,6) DEFAULT 0, -- destek fonu (%15)
  total_collected DECIMAL(18,6) DEFAULT 0,
  total_paid_out DECIMAL(18,6) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dividend_pool (
  guild_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  total_mari DECIMAL(18,6) DEFAULT 0,   -- o hafta biriken fee
  distributed BOOLEAN DEFAULT false,
  distributed_at TIMESTAMPTZ,
  PRIMARY KEY (guild_id, week_start)
);
```

---

## 19. Temettü Sistemi ✅

### 19.1 Mantık

Lot sahipleri sunucunun ticaretinden pay alır.
Sunucu aktifse → çok trade → çok fee → çok temettü.
Bu, uzun vadeli tutmayı teşvik eder ve fiyatı destekler.

### 19.2 Dağıtım Mekanizması

**Periyot:** Haftalık (her Pazartesi gece 01:00 cron)

**Hesaplama:**
```
Kullanıcının payı = (elindeki_lot / toplam_dolaşımdaki_lot) × haftalık_havuz

Örnek:
  Haftalık havuz: 120 MRI
  Dolaşım: 490.000 lot
  Kullanıcı: 5.000 lot

  Pay = (5.000 / 490.000) × 120 = 1.224 MRI
```

**Dolaşım hesabına dahil olmayanlar:**
- Founder'ın kilitli lotları (vesting'de olan)
- Hazine destek alımıyla edinilen lotlar

**Minimum eşik:** 0.001 MRI altı temettü ödenmez, biriktirilir.

### 19.3 Kurallar

- Temettü otomatik olarak `mari_balance`'a eklenir
- Kullanıcı talep etmek zorunda değil (push dağıtım)
- Temettü alabilmek için dağıtım anında en az **100 lot** elinde olmalı
  (spam hesap koruması)
- Dağıtım geçmişi `dividend_history` tablosunda tutulur

### 19.4 DB

```sql
CREATE TABLE dividend_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  week_start DATE NOT NULL,
  lot_snapshot INTEGER NOT NULL,       -- dağıtım anındaki lot sayısı
  mari_received DECIMAL(18,6) NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 20. Referral Sistemi ✅

### 20.1 Mantık

Sunucu borsa ağını büyütmek için yatırımcıları başka sunuculara yönlendirir.
"Arkadaşına bu sunucudan lot al, ikimiz de kazanalım" dinamiği.

### 20.2 Nasıl Çalışır

1. Her kullanıcının kendine özgü referral linki var
2. Kullanıcı A, Sunucu X'i Kullanıcı B'ye önerir
3. B, X'ten ilk kez lot alırsa → A'ya referral ödülü

**Ödül:**
```
Referral ödülü = B'nin ilk alımının fee'sinin %50'si
(platform %15'ten kesilir — DiscoWeb bu maliyeti üstlenir)

Örnek:
  B, 0.5 MRI'lık alım yapar
  Fee: 0.005 MRI
  Referral ödülü = 0.005 × %50 = 0.0025 MRI → A'ya
```

- Ödül Mari cinsinden, anında ödenir
- Zincir referral YOK (sadece 1 kademe)
- Kendi kendine referral açığı: aynı IP/cihazdan engellenebilir (ileride)

### 20.3 Referral Linki

```
activity.discoweb.app/borsa/SunucuAdı?ref=USER_ID
```

Borsa detay sayfasında "Bu sunucuyu öner" butonu → link kopyalanır.

### 20.4 DB

```sql
CREATE TABLE referral_links (
  user_id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,        -- kısa kod, ör. "abc123"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  referee_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  mari_earned DECIMAL(18,6) NOT NULL,
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referee_id, guild_id)      -- her sunucu için 1 referral
);
```

---

---

## 21. Sidebar Yapısı — Ekonomi Kademeleri

### 21.1 Standart Ekonomi (economy_tier = 'basic')

```
◆ Yüksek Ekonomi
  ├── Başvur
  │     Admin:   Başvuru formu
  │     Üye:     Oy ver + sayaç
  └── Başvuru Detayları
        Herkes:  Durum badge + açıklama
```

### 21.2 Yüksek Ekonomi (economy_tier = 'advanced') — Borsa yok

```
◆ Borsa
  └── [Borsa başvurusu yap]
        Admin:   IPO başvuru formu
        Üye:     "Borsa başvurusu bekleniyor"
```

### 21.3 Yüksek Ekonomi + Borsa Aktif (server_listings.status = 'approved')

```
◆ Borsa
  ├── Piyasa          → sunucunun borsa detay sayfası
  ├── Portföyüm       → kişisel pozisyonlar + K/Z
  ├── İşlem Geçmişi   → tüm alım/satımlar
  └── Temettü         → geçmiş ödemeler + sonraki dağıtım tarihi

◆ Mari
  ├── Dönüştür        → Papel → Mari (§12)
  └── Bakiyem         → Mari bakiyesi + tüm sunuculardaki toplam değer
```

### 21.4 IPO Aşaması (status = 'ipo')

```
◆ Borsa
  ├── IPO — [SunucuAdı]   → IPO sayfası (§16.3) — badge'li, geri sayımlı
  ├── Portföyüm
  └── Mari → Dönüştür
```

### 21.5 Genel Borsa (tüm sunucularda görünür)

Sidebar'dan bağımsız, üst navigasyonda veya ayrı sekme:
```
🌐 Tüm Borsa    → tüm listelenmiş sunucular (§16.1 listesi)
```

Kullanıcı kendi sunucusunun borsasını sidebar'dan,
diğer sunucuların borsasını "Tüm Borsa" sayfasından görür.

---

## 22. Tüm DB Tabloları — Özet ✅

### Mevcut (dokunulmayacak)
| Tablo | Açıklama |
|-------|----------|
| `servers` | Sunucu ayarları, economy_tier |
| `member_wallets` | Papel bakiyeleri |
| `server_treasury` | Papel hazinesi |
| `member_profiles` | Kullanıcı profilleri |
| `store_items` | Mağaza ürünleri |
| `store_discounts` | İndirim kodları |
| `promotions` | Promosyon kodları |
| `bot_log_channels` | Log kanal eşlemeleri |

### Mevcut (borsa için kullanılıyor)
| Tablo | Açıklama |
|-------|----------|
| `economy_applications` | YE başvuruları (oylama sistemi) |
| `economy_votes` | Oylama kayıtları |
| `economy_tier_applications` | YE tier başvuruları (direkt) |
| `ipo_applications` | Borsa IPO başvuruları |
| `server_listings` | Listelenmiş sunucular |
| `investor_holdings` | Kullanıcı lot pozisyonları |
| `mari_conversions` | Papel→Mari dönüşüm logları |

### Yeni (implement edilecek)
| Tablo | Açıklama | İlgili Bölüm |
|-------|----------|--------------|
| `ipo_tiers` | IPO aşamalı satış yapısı | §6 |
| `price_history` | Günlük OHLCV fiyat geçmişi | §16.2 |
| `trades` | Her alım/satım işlemi logu | §16.5 |
| `server_mari_treasury` | Sunucu Mari hazinesi | §18.6 |
| `dividend_pool` | Haftalık temettü birikimi | §18.6 |
| `dividend_history` | Temettü dağıtım geçmişi | §19.4 |
| `referral_links` | Kullanıcı referral kodları | §20.4 |
| `referral_conversions` | Referral dönüşüm logları | §20.4 |
| `treasury_holdings` | Hazine destek alımı lotları | §17.2 |
| `mari_daily_global` | Global günlük Mari dönüşüm sayacı | §24.2 |

### Eklenecek kolonlar (mevcut tablolara)
| Tablo | Yeni Kolon | Açıklama |
|-------|-----------|----------|
| `servers` | `mari_rate_override` | Manuel kur override |
| `server_listings` | `current_day_high` | İntraday yüksek |
| `server_listings` | `current_day_low` | İntraday düşük |
| `server_listings` | `support_threshold` | Dinamik destek eşiği |
| `server_listings` | `category` | Sunucu kategorisi |
| `server_listings` | `description` | 280 karakter tanıtım |
| `server_listings` | `founder_vested_lots` | Açılmış founder lot |
| `server_listings` | `vesting_start_date` | Vesting başlangıcı |
| `investor_holdings` | `daily_sell_used` | Günlük satış limiti sayacı |
| `investor_holdings` | `daily_sell_reset_date` | Sayaç sıfırlama tarihi |

---

## 23. API Endpoint Listesi ✅

### Mevcut — Kullanılıyor
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/member/economy-apply` | GET/POST | YE başvuru durumu + başvur/oy ver |
| `/api/member/economy-tier-apply` | POST | YE tier direkt başvuru |
| `/api/member/economy-tier-status` | GET | YE tier durumu |
| `/api/member/ipo-apply` | POST | Borsa IPO başvurusu |
| `/api/member/ipo-status` | GET | IPO başvuru durumu |
| `/api/member/mari-convert` | GET/POST | Papel→Mari dönüşüm |
| `/api/member/market-listings` | GET | Borsa liste sayfası |
| `/api/member/market-orders` | GET | Açık emirler |
| `/api/member/market-order` | POST/DELETE | Emir aç/kapat |
| `/api/member/portfolio` | GET | Portföy |
| `/api/member/wallet` | GET | Mari bakiyesi |

### Yeni — Implement Edilecek
| Endpoint | Method | Açıklama | Öncelik |
|----------|--------|----------|---------|
| `/api/member/trade` | POST | Anlık alım/satım işlemi | 🔴 Kritik |
| `/api/member/market-detail` | GET | Sunucu borsa detay sayfası verisi | 🔴 Kritik |
| `/api/member/price-history` | GET | Grafik için fiyat geçmişi | 🔴 Kritik |
| `/api/member/dividend` | GET | Temettü geçmişi + sonraki dağıtım | 🟡 Önemli |
| `/api/member/referral` | GET/POST | Referral kodu oluştur/sorgula | 🟡 Önemli |
| `/api/member/leaderboard` | GET | Sunucu top yatırımcılar | 🟡 Önemli |
| `/api/member/trade-history` | GET | İşlem geçmişi (kullanıcı bazlı) | 🟡 Önemli |
| `/api/member/recent-trades` | GET | Son işlemler feed (sunucu bazlı) | 🟢 Normal |
| `/api/member/ipo-tiers` | GET | IPO tier durumu | 🟢 Normal |

### Bot Cron Job'ları — Yeni
| Job | Saat | Açıklama |
|-----|------|----------|
| Günlük fiyat güncelleme | 00:00 | Aktivite→fiyat formülü, price_history kayıt |
| Founder vesting kontrolü | 00:05 | Gün 15/30/45 lotları aç |
| Temettü dağıtımı | 01:00 Pazartesi | Haftalık havuzu dağıt |
| Hazine destek kontrolü | 02:00 | 3 gün eşik altındaysa lot al |
| Delist kontrolü | 02:30 | 5 gün eşik altındaysa delist başlat |
| Günlük satış limiti sıfırla | 00:01 | `daily_sell_used = 0` |
| IPO auto-approve | 01:00 | Mevcut (bkz. §6) |

---

### 16.5 DB Gereksinimleri (yeni tablolar)

```sql
-- Günlük fiyat geçmişi
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  date DATE NOT NULL,
  open_price DECIMAL(18,6) NOT NULL,
  close_price DECIMAL(18,6) NOT NULL,
  high_price DECIMAL(18,6) NOT NULL,
  low_price DECIMAL(18,6) NOT NULL,
  volume_lots INTEGER DEFAULT 0,
  UNIQUE(guild_id, date)
);

-- İşlem logu
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  buyer_id TEXT,           -- NULL ise sistem (IPO)
  seller_id TEXT,          -- NULL ise sistem (IPO)
  lot_count INTEGER NOT NULL,
  price_per_lot DECIMAL(18,6) NOT NULL,
  total_mari DECIMAL(18,6) NOT NULL,
  trade_type VARCHAR(10) NOT NULL,  -- 'buy' | 'sell' | 'ipo'
  traded_at TIMESTAMPTZ DEFAULT NOW()
);
```

`investor_holdings` tablosu mevcut — avg_buy_price ve lot_count güncellenir her işlemde.

---

## 11. Yüksek Ekonomi Başvuru Sistemi
> Bu bölüm yalnızca **Yüksek Ekonomi kademesi** başvurusunu kapsar.
> Borsa (IPO) başvurusu için bkz. §13.

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
| Borsa geçişi | Tam sıfırlama, airdrop YOK |
| Bireysel opt-out | YOK — sunucu kararı herkese uygulanır |
| Mari & borsa kullanımı | Her zaman isteğe bağlı (opt-in by action) |
| Developer acil fren | `market_halted` flag, checkGlobalFreeze'e entegre |
