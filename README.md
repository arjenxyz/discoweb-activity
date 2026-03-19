# DiscoWeb â€” Web ArayÃ¼zÃ¼

<div align="center">

[![Website](https://img.shields.io/badge/ğŸŒ_Website-discowebtr.vercel.app-0070f3?style=for-the-badge)](https://discowebtr.vercel.app)
[![Docs](https://img.shields.io/badge/ğŸ“š_Docs-discowebtr.vercel.app/docs-22c55e?style=for-the-badge)](https://discowebtr.vercel.app/docs)
[![Discord](https://img.shields.io/badge/ğŸ’¬_Discord-Sunucuya_KatÄ±l-5865F2?style=for-the-badge)](https://discord.gg/3Y6YNwdE5Q)

**Discord sunucu yÃ¶netimini kolaylaÅŸtÄ±ran, tam entegre modern web paneli.**

</div>

---

## ğŸš€ Nedir?

DiscoWeb'in web arayÃ¼zÃ¼ bileÅŸeni â€” **Next.js 16**, **TypeScript**, **Tailwind CSS** ve **Supabase** ile geliÅŸtirilmiÅŸ tam donanÄ±mlÄ± bir yÃ¶netim panelidir. Discord OAuth2 ile kimlik doÄŸrulama, gerÃ§ek zamanlÄ± bildirimler, maÄŸaza yÃ¶netimi, cÃ¼zdan sistemi ve daha fazlasÄ±nÄ± tek bir arayÃ¼zde sunar.

---

## âœ¨ Ã–zellikler

- ğŸ” **Discord OAuth2 Kimlik DoÄŸrulama** â€” GÃ¼venli oturum yÃ¶netimi
- ğŸª **MaÄŸaza & ÃœrÃ¼n YÃ¶netimi** â€” ÃœrÃ¼n, sipariÅŸ, promosyon ve indirim kodu desteÄŸi
- ğŸ’° **CÃ¼zdan Sistemi** â€” Bakiye transferi ve iÅŸlem geÃ§miÅŸi
- ğŸ“¬ **Dahili MesajlaÅŸma** â€” Sunucu iÃ§i mail sistemi
- ğŸ’¬ **CanlÄ± Sohbet** â€” GerÃ§ek zamanlÄ± chat arayÃ¼zÃ¼
- ğŸ”” **Bildirim Merkezi** â€” AnlÄ±k push bildirimleri (PWA destekli)
- ğŸ”§ **BakÄ±m Modu** â€” Tek tÄ±kla bakÄ±m modu aÃ§ma/kapama

---

## ğŸ› ï¸ Teknoloji YÄ±ÄŸÄ±nÄ±

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router) |
| Dil | TypeScript 5.1 |
| Stil | Tailwind CSS 3 |
| VeritabanÄ± | Supabase (PostgreSQL) |
| Auth | Discord OAuth2 + Supabase SSR |
| Ä°konlar | Lucide React & React Icons |
| PWA | Service Worker + Web Manifest |

---

## ğŸ“¦ Kurulum

### Gereksinimler

- Node.js 18+
- npm / yarn / pnpm
- Supabase projesi
- Discord Developer Application

### 1. Depoyu Klonla

```bash
git clone https://github.com/arjenxyz/discowebtr.git
cd discowebtr
```

### 2. BaÄŸÄ±mlÄ±lÄ±klarÄ± YÃ¼kle

```bash
npm install
```

### 3. Ortam DeÄŸiÅŸkenlerini Ayarla

```bash
cp .env.local.example .env.local
```

`.env.local` dosyasÄ±nÄ± doldurun:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
```

### 4. GeliÅŸtirme Sunucusunu BaÅŸlat

```bash
npm run dev
```

TarayÄ±cÄ±da [http://localhost:3000](http://localhost:3000) adresini aÃ§Ä±n.

---

## ğŸ“œ KullanÄ±labilir Komutlar

```bash
npm run dev      # GeliÅŸtirme sunucusunu baÅŸlatÄ±r (port 3000)
npm run build    # Production build oluÅŸturur
npm run start    # Production sunucusunu baÅŸlatÄ±r
npm run lint     # ESLint ile kod kontrolÃ¼ yapar
```

---

## ğŸ—‚ï¸ Proje YapÄ±sÄ±

```
src/web/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ admin/        # Admin paneli sayfalarÄ±
â”‚   â”œâ”€â”€ dashboard/    # KullanÄ±cÄ± dashboard sayfalarÄ±
â”‚   â”œâ”€â”€ developer/    # GeliÅŸtirici araÃ§larÄ±
â”‚   â”œâ”€â”€ chat/         # CanlÄ± sohbet arayÃ¼zÃ¼
â”‚   â””â”€â”€ auth/         # Kimlik doÄŸrulama akÄ±ÅŸÄ±
â”œâ”€â”€ lib/              # YardÄ±mcÄ± kÃ¼tÃ¼phaneler (auth, cache, supabase vb.)
â”œâ”€â”€ components/       # PaylaÅŸÄ±lan UI bileÅŸenleri
â”œâ”€â”€ public/           # Statik dosyalar & PWA varlÄ±klarÄ±
â””â”€â”€ supabase/         # VeritabanÄ± migration dosyalarÄ±
```

---

## â˜ï¸ DaÄŸÄ±tÄ±m

En kolay daÄŸÄ±tÄ±m yÃ¶ntemi [Vercel](https://vercel.com) platformudur:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/arjenxyz/discowebtr)

Ortam deÄŸiÅŸkenlerini Vercel dashboard'undan ayarlamayÄ± unutmayÄ±n.

---

## ğŸ“„ Lisans

Bu proje Ã¶zel bir lisans altÄ±ndadÄ±r. KullanÄ±m koÅŸullarÄ± iÃ§in [iletiÅŸime geÃ§in](https://discord.gg/3Y6YNwdE5Q).

