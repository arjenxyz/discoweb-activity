# Tag Rozet & Çekiliş Sistemi — Admin Panel Entegrasyon Kılavuzu

## Genel Bakış

Bu kılavuz, **Activity panelinde** (ayrı Next.js projesi) çalışan Tag Rozet & Çekiliş
sisteminin admin tarafını **bu projeye** (tarayıcı web / admin panel projesi) nasıl
ekleyeceğini anlatır.

Activity paneli Supabase'den **sadece okur**. Tüm yazma işlemleri bu admin panelden yapılır.

---

## Supabase'de Mevcut Tablolar

Activity projesi tarafından daha önce şu migration çalıştırılmıştır:

```sql
-- badge_tiers: Sunucu bazlı rozet kademeleri
create table if not exists public.badge_tiers (
  id           uuid primary key default gen_random_uuid(),
  guild_id     text not null,
  name         text not null,          -- "Bronz", "Gümüş", "Altın" vb.
  emoji        text,                   -- "🥉", "🥈", "🥇"
  days_required integer not null,      -- kaç günden sonra kazanılır
  color        text,                   -- hex renk (#CD7F32 vb.)
  description  text,
  sort_order   integer default 0,
  created_at   timestamptz default now(),
  unique(guild_id, days_required)
);

-- raffles: Aktif / geçmiş çekilişler
create table if not exists public.raffles (
  id           uuid primary key default gen_random_uuid(),
  guild_id     text not null,
  title        text not null,
  description  text,
  prizes       jsonb,                  -- ["Steam Gift Card", "Discord Nitro"]
  start_date   timestamptz,
  end_date     timestamptz,
  min_tag_days integer default 1,     -- uygunluk için minimum tag süresi (gün)
  is_active    boolean default true,
  created_at   timestamptz default now()
);
```

Bu tablolar zaten oluşturulmuş durumdadır. **Migration tekrar çalıştırılmaz.**

---

## Bu Projede Yapılacaklar

### Özet

| # | Yapılacak | Dosya |
|---|-----------|-------|
| 1 | Rozet kademeleri API route'u | `app/api/admin/badge-tiers/route.ts` |
| 2 | Çekilişler API route'u | `app/api/admin/raffles/route.ts` |
| 3 | Admin sidebar'a menü ekleme | `app/admin/AdminShell.tsx` |
| 4 | Rozet kademeleri yönetim sayfası | `app/admin/badges/page.tsx` |
| 5 | Çekilişler yönetim sayfası | `app/admin/raffles/page.tsx` |

---

## 1. API Routes

### `app/api/admin/badge-tiers/route.ts`

Mevcut admin API pattern'i örnek al: `app/api/admin/store-items/route.ts`

**Yetki kontrolü:** Her route başında `isAdminOrDeveloper()` çağrısı yapılmalı.
Import: `import { isAdminOrDeveloper, getSelectedGuildId } from '@/lib/adminAuth';`
Supabase: `createClient(supabaseUrl, serviceRoleKey)` ile service role client kullan.

```typescript
// GET  → guild'e ait tüm badge_tiers'ı sort_order ASC döner
// POST → yeni tier oluştur
//        body: { name, emoji?, days_required, color?, description?, sort_order? }
//        Validasyon: name boş olamaz, days_required pozitif integer olmalı
// PUT  → mevcut tier güncelle
//        body: { id, name?, emoji?, days_required?, color?, description?, sort_order? }
// DELETE → tier sil
//        body: { id }
```

**Önemli:** `guild_id` her zaman `getSelectedGuildId()` ile cookie'den alınmalı,
body'den alınmamalı (güvenlik).

---

### `app/api/admin/raffles/route.ts`

Aynı pattern:

```typescript
// GET    → guild'e ait tüm raffles'ı created_at DESC döner
// POST   → yeni çekiliş oluştur
//          body: { title, description?, prizes?, start_date?, end_date?, min_tag_days?, is_active? }
//          prizes bir string array — JSON'da şu şekilde saklanır: ["Steam Gift Card", "Nitro"]
// PUT    → güncelle
//          body: { id, title?, description?, prizes?, start_date?, end_date?, min_tag_days?, is_active? }
// DELETE → sil
//          body: { id }
```

---

## 2. AdminShell.tsx — Sidebar Menü

**Dosya:** `app/admin/AdminShell.tsx`

`MENU_GROUPS` dizisine yeni bir grup ekle. Mevcut "Yönetim" grubunun **öncesine**
eklemek uygun görünüm için önerilir:

```typescript
// Mevcut import'lara ekle:
import { LuAward, LuGift } from 'react-icons/lu';

// MENU_GROUPS içine yeni grup ekle (Ekonomi grubundan sonra):
{
  title: 'Topluluk',
  items: [
    {
      label: 'Rozet & Çekiliş',
      icon: <LuAward className="h-5 w-5" />,
      children: [
        { href: '/admin/badges', label: 'Rozet Kademeleri', group: 'Tag Rozeti', icon: <LuAward className="h-4 w-4" /> },
        { href: '/admin/raffles', label: 'Çekilişler', group: 'Tag Rozeti', icon: <LuGift className="h-4 w-4" /> },
      ],
    },
  ],
},
```

---

## 3. Rozet Kademeleri Sayfası

**Dosya:** `app/admin/badges/page.tsx`

Stil referansı: `app/admin/store/products/page.tsx` (aynı renk/layout kullan)

### Sayfa özellikleri:

**Liste görünümü:**
- Tüm badge_tiers'ı tabloda göster: Emoji | İsim | Gün Gereksinimi | Renk (renkli kutu) | Sıra | İşlemler
- `sort_order`'a göre sırala (küçükten büyüğe)
- Her satırda "Düzenle" ve "Sil" butonu

**Yeni Kademe Oluştur formu (inline veya modal):**

```
Alan            Tip           Validasyon
─────────────────────────────────────────
İsim            text          zorunlu, max 32 karakter
Emoji           text          opsiyonel, max 8 karakter
Gün Gereksinimi number        zorunlu, min 1, tam sayı
Renk            color input   opsiyonel (HTML color picker)
Açıklama        textarea      opsiyonel, max 200 karakter
Sıra No         number        opsiyonel, default 0
```

**Düzenleme:** Satıra tıklayınca inline form açılır veya modal.

**Silme:** Onay dialogu göster (`ConfirmDialog` component'i mevcut: `components/ConfirmDialog.tsx`)

**Örnek UI metinleri:**
```
Başlık: "Rozet Kademeleri"
Açıklama: "Tag taşıyan üyelerin kazanacağı rozet kademelerini tanımlayın."
Alt yazı: "Üyeler tag'i ne kadar süre taşırlarsa o kademeye erişirler."
Boş durum: "Henüz rozet kademesi oluşturulmadı."
```

---

## 4. Çekilişler Sayfası

**Dosya:** `app/admin/raffles/page.tsx`

Stil referansı: `app/admin/store/promos/page.tsx`

### Sayfa özellikleri:

**Liste görünümü:**
- Tüm çekilişleri tabloda göster
- Sütunlar: Başlık | Ödüller | Min. Tag Günü | Bitiş Tarihi | Durum (Aktif/Pasif) | İşlemler
- Aktif çekilişler yeşil badge, pasif/süresi dolmuş gri badge
- Sıralama: `is_active DESC`, sonra `created_at DESC`

**Yeni Çekiliş Oluştur formu:**

```
Alan              Tip           Validasyon
──────────────────────────────────────────────────
Başlık            text          zorunlu, max 100 karakter
Açıklama          textarea      opsiyonel, max 500 karakter
Ödüller           text[]        dinamik liste (ekle/kaldır satırları)
                                Her ödül max 80 karakter
                                Min 1 ödül girilmesi önerilir
Başlangıç Tarihi  datetime-local opsiyonel
Bitiş Tarihi      datetime-local opsiyonel
                                Bitiş, başlangıçtan sonra olmalı
Min. Tag Günü     number        default 1, min 0, tam sayı
Aktif mi?         checkbox      default: true
```

**Ödüller alanı için dinamik liste UI:**
```
[ Steam Gift Card        ] [x]
[ Discord Nitro          ] [x]
[ Spotify Premium        ] [x]
[+ Ödül Ekle]
```
Her satır bir string, kaydetmede `prizes: string[]` olarak API'ye gönderilir.

**Durum yönetimi:**
- "Aktif Yap" / "Pasife Al" toggle butonu listede her satırda
- Bitiş tarihi geçmiş çekilişler otomatik "Süresi Doldu" badge'i gösterir

**Örnek UI metinleri:**
```
Başlık: "Çekilişler"
Açıklama: "Tag taşıyan üyeler için dönemsel çekilişleri yönetin."
Alt yazı: "Aktif çekilişler üyelerin Activity panelinde görünür."
Boş durum: "Henüz çekiliş oluşturulmadı."
```

---

## 5. Tip Tanımları

Her iki sayfada kullanmak için tipleri ilgili dosyaların üstünde tanımla
(veya merkezi bir `types.ts` dosyasına ekle):

```typescript
type BadgeTier = {
  id: string;
  guild_id: string;
  name: string;
  emoji: string | null;
  days_required: number;
  color: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
};

type Raffle = {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  prizes: string[] | null;
  start_date: string | null;
  end_date: string | null;
  min_tag_days: number;
  is_active: boolean;
  created_at: string;
};
```

---

## 6. Activity Paneli ile Uyumluluk

Activity paneli `badge_tiers` tablosunu şu şekilde okur:
- `guild_id` eşleşmesi
- `sort_order ASC` sıralaması
- `days_required` alanını kullanıcının tag süresine karşı karşılaştırır

Activity paneli `raffles` tablosunu şu şekilde okur:
- `is_active = true`
- `end_date IS NULL OR end_date > now()`
- `min_tag_days` ile kullanıcının tag gün sayısını karşılaştırır

**Önemli kurallar:**
1. `days_required` aynı `guild_id` içinde tekil olmalı — API bunu zaten enforce eder
2. `prizes` her zaman `string[]` tipinde JSON'a yazılmalı — `["ödül1", "ödül2"]`
3. `sort_order` sıfırdan başlar, küçük = daha erken kazanılan rozet
4. `is_active = false` çekilişler Activity panelinde gizlenir
5. `guild_id` her zaman cookie'den gelen `selected_guild_id` ile yazılmalı

---

## 7. Supabase RLS Notları

`badge_tiers` ve `raffles` tablolarında şu politikalar tanımlıdır:
- `SELECT`: Herkese açık (Activity paneli auth olmadan okuyabilsin diye)
- `INSERT / UPDATE / DELETE`: **RLS politikası yoktur** — sadece service role key ile
  yapılan işlemler başarılı olur

Admin API route'larında `createClient(url, serviceRoleKey)` kullanıldığı için
bu işlemler sorunsuz çalışır.

---

## 8. Test Senaryoları

Admin panel tamamlandığında şu adımları takip et:

1. Admin panelden 2-3 rozet kademesi ekle (örn: 7 gün Bronz, 30 gün Gümüş, 90 gün Altın)
2. Admin panelden 1 aktif çekiliş ekle (bitiş tarihi gelecekte, is_active: true)
3. Activity panelini aç → OverviewSection altında rozet kartının göründüğünü doğrula
4. `member_profiles.tag_granted_at` dolu olan bir kullanıcı ile giriş yap → ilerleme çubuğunun doğru hesaplandığını kontrol et
5. Admin panelden çekilişi pasife al → Activity panelinde kaybolduğunu doğrula
6. Admin panelden bir rozet kademesini sil → Activity panelinde güncellenen kademelerin yansıdığını doğrula
