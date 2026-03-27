# DiscoWeb Hata Kodları (DW-XXXX)

Her hata kodu **DW-** öneki ile başlar ve 4 haneli bir sayıdan oluşur. Karşılaştığın hata kodunu aşağıdan bularak olası nedenleri ve çözüm yollarını görebilirsin.

---

## DW-1xxx — Kimlik Doğrulama / Oturum

Bu kategori Discord Activity başlatılırken yaşanan auth (kimlik doğrulama) sorunlarını kapsar.

---

### DW-1001 — frame_id Bulunamadı

**Mesaj:** Discord frame_id parametresi bulunamadı.

**Neden olur?**
- Activity penceresi normal bir tarayıcıdan açılmaya çalışıldı (Discord dışı).
- URL'de `frame_id` parametresi eksik; Discord bu değeri Activity başlarken otomatik ekler.
- Çok eski veya desteklenmeyen bir Discord istemcisi kullanılıyor.

**Çözüm**
- Activity'yi Discord masaüstü veya mobil uygulaması üzerinden aç.
- Discord uygulamasını güncelleyerek tekrar dene.
- Pencereyi kapatıp yeniden aç.

---

### DW-1002 — SDK Zaman Aşımı

**Mesaj:** Authentication timeout. Lütfen Activity penceresini kapatıp tekrar açın.

**Neden olur?**
- Discord SDK 90 saniye içinde hazır hale gelemedi.
- İnternet bağlantısı yavaş veya kesintili.
- Discord sunucuları geçici olarak yüksek yük altında.

**Çözüm**
- Activity penceresini kapatıp tekrar aç.
- İnternet bağlantını kontrol et.
- Birkaç dakika bekleyip tekrar dene.

---

### DW-1003 — Client ID Tanımlı Değil

**Mesaj:** Discord Client ID tanımlı değil (NEXT_PUBLIC_DISCORD_CLIENT_ID).

**Neden olur?**
- Sunucu yapılandırmasında `NEXT_PUBLIC_DISCORD_CLIENT_ID` ortam değişkeni eksik.
- Bu bir geliştirici/dağıtım hatasıdır, kullanıcı kaynaklı değildir.

**Çözüm**
- Bu hatayı görüyorsan "Bildir" butonuna basarak geliştiriciyi haberdar et.
- Geliştirici için: Ortam değişkenlerini kontrol et.

---

### DW-1004 — SDK Kimlik Doğrulaması Başarısız

**Mesaj:** Discord yetkilendirmesi başarısız.

**Neden olur?**
- Discord OAuth akışı tamamlanamadı.
- Kullanıcı izin penceresini kapattı veya reddetti.
- Discord API geçici bir hata döndürdü.
- Backend auth endpoint'e ulaşılamadı.

**Çözüm**
- Activity penceresini kapatıp tekrar aç; izin ekranı gelirse onayla.
- İnternet bağlantını kontrol et.
- Birkaç dakika bekleyip tekrar dene.

---

### DW-1005 — OAuth Token Alınamadı

**Mesaj:** Discord OAuth token alınamadı.

**Neden olur?**
- Discord token exchange adımı başarısız oldu.
- Backend ile Discord arasındaki iletişimde sorun var.

**Çözüm**
- Activity'yi yeniden aç.
- Sorun devam ederse geliştiriciyi bildir.

---

## DW-2xxx — Sunucu Yapılandırması

Bu kategori Discord sunucusunun DiscoWeb sistemine kayıt ve kurulum sorunlarını kapsar. Genellikle sunucu yöneticisinin harekete geçmesi gerekir.

---

### DW-2001 — Sunucu Kayıtlı Değil

**Mesaj:** Sunucu sisteme kayıtlı değil. Yönetici kurulum yapmalı.

**Neden olur?**
- Discord sunucusu DiscoWeb sistemine hiç kaydedilmemiş.
- Yönetici setup adımlarını henüz tamamlamamış.

**Çözüm (Yöneticiler için)**
- [discoweb.tech](https://discoweb.tech) adresine git ve sunucunu kaydet.
- Setup adımlarını tamamla.

**Çözüm (Üyeler için)**
- Sunucu yöneticinize bu hatayı bildirin.

---

### DW-2002 — Sunucu Kurulumu Tamamlanmamış

**Mesaj:** Sunucu kurulumu tamamlanmamış. Yönetici setup'ı bitirmeli.

**Neden olur?**
- Sunucu sisteme kayıtlı ama `is_setup=false` durumunda.
- Yönetici kurulum sürecini yarıda bırakmış.

**Çözüm (Yöneticiler için)**
- [discoweb.tech](https://discoweb.tech) adresine git ve kurulumu tamamla.

---

### DW-2003 — Bot Sunucuda Bulunamıyor

**Mesaj:** Bot sunucuda bulunamıyor. Yönetici botu yeniden davet etmeli.

**Neden olur?**
- DiscoWeb botu sunucudan çıkarılmış veya hiç eklenmemiş.
- Bot sunucuda bulunuyor ama yetkileri kaldırılmış.

**Çözüm (Yöneticiler için)**
- Botu sunucuya yeniden davet et.
- Gerekli yetkilerin (Rolleri Yönet, Mesaj Gönder, vb.) verildiğinden emin ol.

**Çözüm (Üyeler için)**
- Sunucu yöneticinize bu hatayı bildirin.

---

### DW-2004 — Discord API Hatası

**Mesaj:** Discord API geçici hata verdi. Birkaç dakika sonra tekrar dene.

**Neden olur?**
- Discord'un kendi API'si geçici olarak çalışmıyor.
- Discord'un [status sayfasında](https://discordstatus.com) aktif bir olay var.

**Çözüm**
- Birkaç dakika bekleyip tekrar dene.
- [discordstatus.com](https://discordstatus.com) adresini kontrol et.

---

### DW-2005 — Servis Anahtarı Eksik

**Mesaj:** Sunucu yapılandırması eksik (servis anahtarı).

**Neden olur?**
- `SUPABASE_SERVICE_ROLE_KEY` ortam değişkeni eksik veya hatalı.
- Bu bir sunucu tarafı yapılandırma hatasıdır.

**Çözüm**
- Bu hatayı görüyorsan "Bildir" butonuna basarak geliştiriciyi haberdar et.

---

### DW-2006 — Bot Token Eksik

**Mesaj:** Bot token yapılandırması eksik.

**Neden olur?**
- `DISCORD_BOT_TOKEN` ortam değişkeni sunucu tarafında tanımlı değil.
- Bu bir geliştirici/dağıtım hatasıdır.

**Çözüm**
- Bu hatayı görüyorsan "Bildir" butonuna basarak geliştiriciyi haberdar et.

---

## DW-3xxx — Kullanıcı / Yetki

Bu kategori kullanıcı hesabı ve izin sorunlarını kapsar.

---

### DW-3001 — Oturum Geçersiz

**Mesaj:** Oturum geçersiz veya süresi dolmuş. Yeniden giriş gerekiyor.

**Neden olur?**
- Oturum çerezi süresi dolmuş.
- Oturum verisi bozulmuş veya silinmiş.
- Activity çok uzun süre açık kaldı.

**Çözüm**
- Activity penceresini kapatıp yeniden aç; otomatik olarak yeniden giriş yapılır.
- "Oturumu Sıfırla" butonuna basarak tüm session verilerini temizle.

---

### DW-3002 — Sunucu Üyesi Değilsin

**Mesaj:** Bu sunucuda üye değilsin.

**Neden olur?**
- Discord hesabın bu sunucudan çıkarılmış veya sunucuya hiç katılmamış.
- Activity farklı bir hesapla açılmaya çalışılıyor.

**Çözüm**
- Önce Discord'da bu sunucuya üye olduğundan emin ol.
- Doğru Discord hesabınla giriş yaptığını kontrol et.

---

### DW-3003 — Kullanıcı Profili Bulunamadı

**Mesaj:** Kullanıcı profili bulunamadı.

**Neden olur?**
- Bu sunucu için henüz bir DiscoWeb profili oluşturulmamış.
- Profil verisi sistemden silinmiş.

**Çözüm**
- İlk kez giriyorsan profil oluşturma ekranı otomatik açılır; formu doldur.
- Sorun devam ederse Activity'yi yeniden aç.

---

### DW-3004 — Gerekli Rol Eksik

**Mesaj:** Bu özellik için gerekli rol eksik.

**Neden olur?**
- Bu özelliği kullanmak için gereken Discord rolüne sahip değilsin.
- Sunucu yöneticisi bu özelliği belirli rollerle kısıtlamış.

**Çözüm**
- Sunucu yöneticinizden gerekli rolü talep edin.

---

### DW-3005 — Yetersiz Yetki

**Mesaj:** Bu işlem için yetkin yok.

**Neden olur?**
- İşlem için gereken sunucu iznine sahip değilsin.
- Yönetici paneline üye olarak erişmeye çalışıyorsun.

**Çözüm**
- Sunucu yöneticinizle iletişime geçin.

---

## DW-4xxx — Ekonomi

Bu kategori ekonomi sistemi ile ilgili işlem hatalarını kapsar.

---

### DW-4001 — Yüksek Ekonomi Gerekli

**Mesaj:** Bu özellik yüksek ekonomi gerektiriyor.

**Neden olur?**
- Erişmeye çalıştığın özellik (Borsa, Hazine, Piyasa vb.) sunucunun yüksek ekonomi planında olmasını gerektiriyor.
- Sunucu hâlâ temel ekonomi planında.

**Çözüm**
- Sunucu yöneticinizden Yüksek Ekonomi başvurusu yapmasını isteyin.
- Yöneticiyseniz sol menüdeki "Yüksek Ekonomi Başvurusu" bölümünden başvuru yapabilirsiniz.

---

### DW-4002 — Yetersiz Bakiye

**Mesaj:** İşlem bakiyeniz yetersiz.

**Neden olur?**
- Yapmak istediğin işlem için yeterli bakiyen yok.

**Çözüm**
- Bakiyeni kontrol et.
- Kazanma yollarını (check-in, mesaj, ses vb.) kullanarak bakiye topla.

---

### DW-4003 — Günlük Transfer Limiti

**Mesaj:** Günlük transfer limitine ulaşıldı.

**Neden olur?**
- 24 saat içinde transfer yapabileceğin maksimum miktara ulaştın.

**Çözüm**
- 24 saat bekle ve tekrar dene.

---

## DW-5xxx — Ağ / API

Bu kategori bağlantı ve ağ sorunlarını kapsar.

---

### DW-5001 — Sunucuya Bağlanılamadı

**Mesaj:** Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.

**Neden olur?**
- İnternet bağlantısı yok veya çok yavaş.
- DiscoWeb sunucuları geçici olarak erişilemez durumda.

**Çözüm**
- İnternet bağlantını kontrol et.
- Birkaç saniye bekleyip tekrar dene.

---

### DW-5002 — API Yanıt Vermedi

**Mesaj:** API yanıt vermedi. Sunucu geçici olarak meşgul olabilir.

**Neden olur?**
- DiscoWeb API sunucusu yüksek yük altında.
- İstek zaman aşımına uğradı.

**Çözüm**
- Birkaç saniye bekleyip tekrar dene.
- Sorun devam ederse geliştiriciyi bildir.

---

### DW-5003 — Geçersiz API Yanıtı

**Mesaj:** Geçersiz API yanıtı alındı.

**Neden olur?**
- API beklenmeyen formatta yanıt döndürdü.
- Muhtemelen bir deploy veya versiyon uyumsuzluğu.

**Çözüm**
- Sayfayı yenile veya Activity'yi yeniden aç.
- Sorun devam ederse geliştiriciyi bildir.

---

## DW-9xxx — Yakalanmamış / Bilinmeyen

Bu kategori sistemin otomatik olarak yakaladığı beklenmedik hataları kapsar. Bu hatalar genellikle bir JavaScript çöküşünden kaynaklanır ve ekranda "Arka planda bir hata oluştu" bildirimi gösterir.

---

### DW-9001 — Beklenmeyen JavaScript Hatası

**Mesaj:** Beklenmeyen bir JavaScript hatası oluştu.

**Neden olur?**
- Uygulama kodunda beklenmedik bir durum oluştu.
- Tarayıcı/Discord istemci uyumsuzluğu.

**Çözüm**
- Bildirimi gördüğünde "Geliştiricide Bildir" butonuna bas.
- Activity'yi yeniden aç.

---

### DW-9002 — İşlenmeyen Promise Hatası

**Mesaj:** İşlenmeyen bir Promise hatası oluştu.

**Neden olur?**
- Bir ağ isteği veya asenkron işlem beklenmedik şekilde başarısız oldu ve hata yakalanmadı.

**Çözüm**
- Bildirimi gördüğünde "Geliştiricide Bildir" butonuna bas.
- Activity'yi yeniden aç.

---

### DW-9003 — Bilinmeyen Hata

**Mesaj:** Bilinmeyen bir hata oluştu.

**Neden olur?**
- Hata kaynağı belirlenemedi.

**Çözüm**
- "Geliştiricide Bildir" butonuna basarak geliştiriciyi haberdar et.
- Activity'yi yeniden aç.

---

## Hata Bildirimi

Herhangi bir hatayla karşılaştığında:

1. **Ekrandaki "Bildir" butonuna bas** — hata detayları otomatik olarak geliştiriciye iletilir.
2. Eğer butona basma imkânın yoksa, hata kodunu (örn. `DW-1004`) Discord sunucusunda destek kanalına yaz.

---

## Hızlı Başvuru Tablosu

| Kod | Kategori | Kısa Açıklama |
|-----|----------|---------------|
| DW-1001 | Auth | frame_id bulunamadı |
| DW-1002 | Auth | SDK zaman aşımı |
| DW-1003 | Auth | Client ID eksik (geliştirici hatası) |
| DW-1004 | Auth | SDK auth başarısız |
| DW-1005 | Auth | OAuth token alınamadı |
| DW-2001 | Sunucu | Sunucu kayıtlı değil |
| DW-2002 | Sunucu | Kurulum tamamlanmamış |
| DW-2003 | Sunucu | Bot sunucuda yok |
| DW-2004 | Sunucu | Discord API hatası |
| DW-2005 | Sunucu | Servis anahtarı eksik (geliştirici hatası) |
| DW-2006 | Sunucu | Bot token eksik (geliştirici hatası) |
| DW-3001 | Kullanıcı | Oturum süresi dolmuş |
| DW-3002 | Kullanıcı | Sunucu üyesi değil |
| DW-3003 | Kullanıcı | Profil bulunamadı |
| DW-3004 | Kullanıcı | Gerekli rol eksik |
| DW-3005 | Kullanıcı | Yetersiz yetki |
| DW-4001 | Ekonomi | Yüksek ekonomi gerekli |
| DW-4002 | Ekonomi | Yetersiz bakiye |
| DW-4003 | Ekonomi | Günlük limit aşıldı |
| DW-5001 | Ağ | Sunucuya bağlanılamadı |
| DW-5002 | Ağ | API yanıt vermedi |
| DW-5003 | Ağ | Geçersiz API yanıtı |
| DW-9001 | Bilinmeyen | Beklenmeyen JS hatası |
| DW-9002 | Bilinmeyen | İşlenmeyen Promise hatası |
| DW-9003 | Bilinmeyen | Bilinmeyen hata |
