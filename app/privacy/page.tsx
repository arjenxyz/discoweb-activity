"use client";

import { useEffect, useState } from 'react';
import { LuShield, LuDatabase, LuEye, LuShare2, LuClock, LuLock, LuSettings, LuMessageCircle, LuChevronRight, LuArrowLeft } from 'react-icons/lu';

export default function PrivacyPage() {
  const LAST_UPDATED = '14 Mart 2026';
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    document.title = 'Gizlilik PolitikasÄ± - DiscoWeb';

    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = 'intro';
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120) current = section.id;
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NAV_ITEMS = [
    { id: 'intro', label: 'GiriÅŸ', icon: LuShield },
    { id: 'about', label: 'Platform HakkÄ±nda', icon: LuEye },
    { id: 'what', label: 'Toplanan Veriler', icon: LuDatabase },
    { id: 'how-we-use', label: 'Verilerin KullanÄ±mÄ±', icon: LuSettings },
    { id: 'sharing', label: 'ÃœÃ§Ã¼ncÃ¼ Taraflar', icon: LuShare2 },
    { id: 'retention', label: 'Saklama SÃ¼resi', icon: LuClock },
    { id: 'protection', label: 'GÃ¼venlik', icon: LuLock },
    { id: 'control', label: 'HaklarÄ±nÄ±z', icon: LuSettings },
    { id: 'contact', label: 'Ä°letiÅŸim', icon: LuMessageCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0d12]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/gif/cat.gif" alt="DiscoWeb" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-base text-white">DiscoWeb</span>
            <span className="text-[11px] text-white/30 font-medium tracking-wide hidden sm:inline">GÄ°ZLÄ°LÄ°K POLÄ°TÄ°KASI</span>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors"
          >
            <LuArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Geri DÃ¶n</span>
          </button>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto mt-[60px]">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 min-h-screen fixed top-[60px] left-0 lg:left-auto z-40 border-r border-white/[0.04]">
          <nav className="p-6 pt-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 mb-4 px-3">Ä°Ã§indekiler</p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03] border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      {item.label}
                      {isActive && <LuChevronRight className="w-3 h-3 ml-auto" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 lg:ml-72">
          <article className="max-w-3xl px-5 sm:px-10 py-8 sm:py-14">
            {/* Hero */}
            <header className="mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
                <LuShield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-semibold text-indigo-400 tracking-wide">GÄ°ZLÄ°LÄ°K & VERÄ° GÃœVENLÄ°ÄÄ°</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
                Gizlilik PolitikasÄ±
              </h1>
              <p className="text-[15px] text-white/50 leading-relaxed mb-6">
                DiscoWeb olarak kullanÄ±cÄ±larÄ±mÄ±zÄ±n gizliliÄŸine saygÄ± duyar ve verilerinizi korumayÄ± Ã¶ncelikli tutarÄ±z.
                Bu politika, platformumuzu kullanÄ±rken hangi verilerin toplandÄ±ÄŸÄ±nÄ±, nasÄ±l iÅŸlendiÄŸini ve haklarÄ±nÄ±zÄ± aÃ§Ä±klar.
              </p>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span>Son gÃ¼ncelleme: {LAST_UPDATED}</span>
              </div>
            </header>

            <div className="space-y-14">
              {/* GiriÅŸ */}
              <section id="intro" className="scroll-mt-24">
                <SectionTitle>GiriÅŸ</SectionTitle>
                <P>
                  Bu Gizlilik PolitikasÄ±, DiscoWeb platformunu (web sitesi ve Discord botu dahil) kullanÄ±rken
                  kiÅŸisel verilerinizin nasÄ±l toplandÄ±ÄŸÄ±nÄ±, iÅŸlendiÄŸini ve korunduÄŸunu aÃ§Ä±klar.
                  Platformumuzu kullanarak bu politikayÄ± kabul etmiÅŸ sayÄ±lÄ±rsÄ±nÄ±z.
                </P>
                <InfoCard items={[
                  'KiÅŸisel bilgilerinizi Ã¼Ã§Ã¼ncÃ¼ taraflara satmayÄ±z',
                  'YalnÄ±zca hizmet iÃ§in gerekli verileri toplarÄ±z',
                  'Discord OAuth2 dÄ±ÅŸÄ±nda herhangi bir ÅŸifre veya hassas kimlik bilgisi saklamayÄ±z',
                  'Verilerinizin silinmesini istediÄŸiniz an talep edebilirsiniz',
                ]} />
              </section>

              {/* Platform HakkÄ±nda */}
              <section id="about" className="scroll-mt-24">
                <SectionTitle>Platform HakkÄ±nda</SectionTitle>
                <P>
                  DiscoWeb, Discord sunucularÄ± iÃ§in web tabanlÄ± bir yÃ¶netim panelidir. Platform aÅŸaÄŸÄ±daki hizmetleri sunar:
                </P>
                <ul className="space-y-2 mt-4">
                  {[
                    'Sunucu Ã¼yelerinin aktivitelerini (mesaj sayÄ±sÄ±, ses sÃ¼resi) takip etme',
                    'Sunucu iÃ§i sanal ekonomi sistemi (Papel) ile maÄŸaza ve rol satÄ±ÅŸÄ±',
                    'Discord Activity icinde uye odakli istatistik ve ekonomi deneyimi',
                    'Discord botu aracÄ±lÄ±ÄŸÄ±yla otomatik rol yÃ¶netimi ve bildirimler',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-white/60 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400/60 flex-shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Toplanan Veriler */}
              <section id="what" className="scroll-mt-24">
                <SectionTitle>Toplanan Veriler</SectionTitle>
                <P>
                  Platformumuzu kullanÄ±rken aÅŸaÄŸÄ±daki veriler toplanÄ±r veya iÅŸlenir:
                </P>

                <DataCategory title="Discord Hesap Bilgileri" description="Discord OAuth2 ile giriÅŸ yaptÄ±ÄŸÄ±nÄ±zda alÄ±nÄ±r">
                  {['Discord kullanÄ±cÄ± kimliÄŸiniz (User ID)', 'KullanÄ±cÄ± adÄ±nÄ±z ve profil fotoÄŸrafÄ±nÄ±z', 'Ãœyesi olduÄŸunuz sunucu listesi (botun bulunduÄŸu sunucular)']}
                </DataCategory>

                <DataCategory title="Sunucu Ä°Ã§i Aktivite Verileri" description="Discord botu tarafÄ±ndan toplanÄ±r">
                  {['Mesaj sayÄ±sÄ± (mesaj iÃ§erikleri saklanmaz)', 'Ses kanalÄ±nda geÃ§irilen sÃ¼re', 'Sunucuya katÄ±lÄ±m tarihi ve rol bilgileri']}
                </DataCategory>

                <DataCategory title="Platform KullanÄ±m Verileri" description="Web paneli kullanÄ±mÄ± sÄ±rasÄ±nda oluÅŸur">
                  {['MaÄŸaza satÄ±n alÄ±m geÃ§miÅŸi ve bakiye hareketleri', 'Posta kutusu bildirimleri', 'Denetim gÃ¼nlÃ¼kleri (audit log) â€” IP adresi ve tarayÄ±cÄ± bilgisi dahil']}
                </DataCategory>

                <div className="mt-5 p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                  <p className="text-[13px] text-amber-300/80 leading-relaxed">
                    <strong className="text-amber-300">Ã–nemli:</strong> Discord mesaj iÃ§eriklerinizi, Ã¶zel mesajlarÄ±nÄ±zÄ± veya ses kayÄ±tlarÄ±nÄ±zÄ±
                    hiÃ§bir koÅŸulda saklamayÄ±z. YalnÄ±zca mesaj ve ses aktivite sayÄ±larÄ±/sÃ¼releri iÅŸlenir.
                  </p>
                </div>
              </section>

              {/* KullanÄ±m */}
              <section id="how-we-use" className="scroll-mt-24">
                <SectionTitle>Verilerin KullanÄ±mÄ±</SectionTitle>
                <P>Toplanan veriler yalnÄ±zca aÅŸaÄŸÄ±daki amaÃ§larla kullanÄ±lÄ±r:</P>
                <ul className="space-y-2 mt-4">
                  {[
                    'KullanÄ±cÄ± kimliÄŸini doÄŸrulamak ve oturum yÃ¶netimi saÄŸlamak',
                    'Sunucu istatistiklerini hesaplamak ve liderlik tablosunu oluÅŸturmak',
                    'Sanal ekonomi (Papel) iÅŸlemlerini gerÃ§ekleÅŸtirmek',
                    'MaÄŸaza sipariÅŸlerini iÅŸlemek ve satÄ±n alÄ±nan rolleri atamak',
                    'YÃ¶netici panelindeki Ã¶zet ve raporlarÄ± sunmak',
                    'Platformun gÃ¼venliÄŸini ve bÃ¼tÃ¼nlÃ¼ÄŸÃ¼nÃ¼ korumak',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-white/60 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400/60 flex-shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </section>

              {/* ÃœÃ§Ã¼ncÃ¼ Taraflar */}
              <section id="sharing" className="scroll-mt-24">
                <SectionTitle>ÃœÃ§Ã¼ncÃ¼ Taraf Hizmetler</SectionTitle>
                <P>
                  Platformumuz Ã§alÄ±ÅŸmak iÃ§in aÅŸaÄŸÄ±daki Ã¼Ã§Ã¼ncÃ¼ taraf hizmetleri kullanÄ±r.
                  Bu hizmetlere yalnÄ±zca iÅŸlevsellik iÃ§in gerekli olan minimum dÃ¼zeyde veri aktarÄ±lÄ±r:
                </P>

                <div className="mt-5 space-y-3">
                  <ThirdPartyCard name="Discord API" purpose="KullanÄ±cÄ± kimlik doÄŸrulama, rol yÃ¶netimi, sunucu bilgileri" />
                  <ThirdPartyCard name="Supabase" purpose="VeritabanÄ± barÄ±ndÄ±rma (kullanÄ±cÄ± verileri, sipariÅŸler, bakiyeler)" />
                  <ThirdPartyCard name="Vercel" purpose="Web uygulamasÄ± barÄ±ndÄ±rma ve daÄŸÄ±tÄ±mÄ±" />
                </div>

                <div className="mt-5 p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                  <p className="text-[13px] text-emerald-300/80 leading-relaxed">
                    KiÅŸisel verilerinizi reklam, pazarlama veya profilleme amacÄ±yla Ã¼Ã§Ã¼ncÃ¼ taraflarla <strong className="text-emerald-300">asla paylaÅŸmayÄ±z ve satmayÄ±z</strong>.
                  </p>
                </div>
              </section>

              {/* Saklama SÃ¼resi */}
              <section id="retention" className="scroll-mt-24">
                <SectionTitle>Veri Saklama SÃ¼resi</SectionTitle>
                <P>Verileriniz aÅŸaÄŸÄ±daki koÅŸullarla saklanÄ±r:</P>
                <ul className="space-y-2 mt-4">
                  {[
                    'Hesap verileri â€” hesabÄ±nÄ±z aktif olduÄŸu sÃ¼rece saklanÄ±r',
                    'Aktivite istatistikleri â€” sunucu yÃ¶neticisi verileri sÄ±fÄ±rlamadÄ±kÃ§a saklanÄ±r',
                    'SipariÅŸ ve iÅŸlem geÃ§miÅŸi â€” hesap silinene kadar saklanÄ±r',
                    'Denetim gÃ¼nlÃ¼kleri â€” gÃ¼venlik amacÄ±yla 90 gÃ¼ne kadar saklanabilir',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-white/60 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400/60 flex-shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
                <P className="mt-4">
                  HesabÄ±nÄ±zÄ± silmek istediÄŸinizde, Discord sunucumuzdaki destek kanalÄ± Ã¼zerinden talepte bulunabilirsiniz.
                  Silme iÅŸlemi tÃ¼m kiÅŸisel verilerinizi ve iliÅŸkili kayÄ±tlarÄ± kapsar.
                </P>
              </section>

              {/* GÃ¼venlik */}
              <section id="protection" className="scroll-mt-24">
                <SectionTitle>GÃ¼venlik Ã–nlemleri</SectionTitle>
                <P>Verilerinizin gÃ¼venliÄŸi iÃ§in aldÄ±ÄŸÄ±mÄ±z teknik Ã¶nlemler:</P>
                <ul className="space-y-2 mt-4">
                  {[
                    'TÃ¼m veri aktarÄ±mlarÄ± HTTPS/TLS ÅŸifrelemesi ile korunur',
                    'VeritabanÄ± eriÅŸimi service role key ile sÄ±nÄ±rlandÄ±rÄ±lmÄ±ÅŸtÄ±r',
                    'Discord OAuth2 token\'larÄ± gÃ¼venli httpOnly Ã§erezlerde saklanÄ±r',
                    'Admin ve geliÅŸtirici panellerine yalnÄ±zca yetkili kullanÄ±cÄ±lar eriÅŸebilir',
                    'Hassas iÅŸlemler (bakiye deÄŸiÅŸikliÄŸi, rol atama vb.) denetim gÃ¼nlÃ¼ÄŸÃ¼ne kaydedilir',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-white/60 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400/60 flex-shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </section>

              {/* HaklarÄ±nÄ±z */}
              <section id="control" className="scroll-mt-24">
                <SectionTitle>HaklarÄ±nÄ±z</SectionTitle>
                <P>KullanÄ±cÄ± olarak aÅŸaÄŸÄ±daki haklara sahipsiniz:</P>

                <div className="mt-5 grid gap-3">
                  <RightCard title="EriÅŸim HakkÄ±" desc="HakkÄ±nÄ±zda saklanan verilerin bir kopyasÄ±nÄ± talep edebilirsiniz." />
                  <RightCard title="DÃ¼zeltme HakkÄ±" desc="YanlÄ±ÅŸ veya eksik bilgilerin dÃ¼zeltilmesini isteyebilirsiniz." />
                  <RightCard title="Silme HakkÄ±" desc="HesabÄ±nÄ±zÄ±n ve tÃ¼m verilerinizin kalÄ±cÄ± olarak silinmesini talep edebilirsiniz." />
                  <RightCard title="Ä°tiraz HakkÄ±" desc="Verilerinizin iÅŸlenmesine herhangi bir zamanda itiraz edebilirsiniz." />
                </div>

                <P className="mt-4">
                  Bu haklarÄ±nÄ±zÄ± kullanmak iÃ§in aÅŸaÄŸÄ±daki iletiÅŸim kanallarÄ±ndan bize ulaÅŸabilirsiniz.
                  Talepler en geÃ§ 30 gÃ¼n iÃ§inde yanÄ±tlanÄ±r.
                </P>
              </section>

              {/* Ä°letiÅŸim */}
              <section id="contact" className="scroll-mt-24">
                <SectionTitle>Ä°letiÅŸim</SectionTitle>
                <P>
                  Bu gizlilik politikasÄ± veya verileriniz hakkÄ±nda sorularÄ±nÄ±z iÃ§in:
                </P>
                <div className="mt-5 space-y-3">
                  <ContactCard icon="ğŸ’¬" label="Discord Sunucusu" value="Destek kanalÄ± Ã¼zerinden bize ulaÅŸabilirsiniz" />
                  <ContactCard icon="ğŸŒ" label="Web Sitesi" value="discoweb.tr iletiÅŸim sayfasÄ±" />
                </div>

                <div className="mt-8 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    Bu politika zaman zaman gÃ¼ncellenebilir. Ã–nemli deÄŸiÅŸiklikler yapÄ±ldÄ±ÄŸÄ±nda platform iÃ§i bildirim
                    ve/veya Discord sunucumuz Ã¼zerinden duyuru yapÄ±lÄ±r. GÃ¼ncel politikayÄ± bu sayfadan takip edebilirsiniz.
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/25">
                DiscoWeb Gizlilik PolitikasÄ± â€” Son gÃ¼ncelleme: {LAST_UPDATED}
              </p>
            </footer>
          </article>
        </main>
      </div>
    </div>
  );
}

/* â”€â”€â”€ YardÄ±mcÄ± bileÅŸenler â”€â”€â”€ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
      {children}
    </h2>
  );
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[14px] text-white/55 leading-relaxed ${className}`}>{children}</p>;
}

function InfoCard({ items }: { items: string[] }) {
  return (
    <div className="mt-5 p-5 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10">
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-[13px] text-indigo-300/80 leading-relaxed">
            <span className="mt-1 text-indigo-400">âœ“</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataCategory({ title, description, children }: { title: string; description: string; children: string[] }) {
  return (
    <div className="mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <h3 className="text-[14px] font-semibold text-white/90 mb-1">{title}</h3>
      <p className="text-[12px] text-white/30 mb-3">{description}</p>
      <ul className="space-y-1.5">
        {children.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-white/55 leading-relaxed">
            <span className="mt-1 w-1 h-1 rounded-full bg-white/20 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThirdPartyCard({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
        <LuShare2 className="w-4 h-4 text-white/40" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white/80">{name}</p>
        <p className="text-[12px] text-white/40 mt-0.5">{purpose}</p>
      </div>
    </div>
  );
}

function RightCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <h4 className="text-[13px] font-semibold text-white/80 mb-1">{title}</h4>
      <p className="text-[12px] text-white/40">{desc}</p>
    </div>
  );
}

function ContactCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold text-white/80">{label}</p>
        <p className="text-[12px] text-white/40">{value}</p>
      </div>
    </div>
  );
}

