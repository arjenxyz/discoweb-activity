import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MAINTENANCE_KEYS, getMaintenanceFlags } from '@/lib/maintenance';
import MaintenanceWatcher from './maintenance-watcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const LABELS: Record<string, string> = {
  store: 'Mağaza',
  transactions: 'İşlemler',
  tracking: 'Mağaza Takip',
  promotions: 'Promosyon',
  discounts: 'İndirim Kodu',
  transfers: 'Papel Gönder',
};

export default async function MaintenancePage() {
  const data = await getMaintenanceFlags();
  const flags = data?.flags ?? null;

  const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '1465698764453838882';
  const botToken = process.env.DISCORD_BOT_TOKEN;

  const getProfile = async (userId: string) => {
    if (!botToken) return null;
    const response = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!response.ok) return null;
    const member = (await response.json()) as {
      nick?: string;
      user?: { id: string; username: string; avatar: string | null; global_name?: string | null };
    };
    const id = member.user?.id ?? userId;
    const avatarHash = member.user?.avatar;
    const avatarUrl = avatarHash
      ? `https://cdn.discordapp.com/avatars/${id}/${avatarHash}.png?size=96`
      : `https://cdn.discordapp.com/embed/avatars/${Number(id) % 5}.png`;
    return {
      id,
      name: member.nick ?? member.user?.global_name ?? member.user?.username ?? id,
      avatarUrl,
    };
  };

  const active = flags ? MAINTENANCE_KEYS.filter((key) => key !== 'site' && flags[key].is_active) : [];
  const flagsSignature = flags
    ? MAINTENANCE_KEYS.map((key) => {
        const flag = flags[key];
        return `${key}:${flag.is_active ? 1 : 0}:${flag.reason ?? ''}:${flag.updated_at ?? ''}`;
      }).join('|')
    : 'none';
  const updaterIds = flags
    ? MAINTENANCE_KEYS.map((key) => flags[key].updated_by).filter((value): value is string => Boolean(value))
    : [];
  const uniqueIds = [...new Set(updaterIds)];
  const profiles = await Promise.all(uniqueIds.map(async (id) => [id, await getProfile(id)]));
  const updaterProfiles = Object.fromEntries(
    profiles.filter(([, profile]) => profile).map(([id, profile]) => [id, profile]),
  ) as Record<string, { id: string; name: string; avatarUrl: string }>;
  const isSiteMaintenance = Boolean(flags?.site?.is_active);
  const siteUpdaterId = flags?.site?.updated_by;
  const siteUpdater = siteUpdaterId ? updaterProfiles[siteUpdaterId] : undefined;

  if (!isSiteMaintenance && active.length === 0) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <MaintenanceWatcher signature={flagsSignature} />

      <main className="flex min-h-screen w-full flex-col items-start justify-center px-8 sm:px-16">
        <div className="flex flex-col gap-5 max-w-lg">
          <p className="w-fit rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300/80 backdrop-blur-md">
            Bakım Modu
          </p>

          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
              {isSiteMaintenance ? 'Kısa bir mola veriyoruz.' : 'Bazı özellikler geçici olarak kapalı.'}
            </h1>
            <p className="text-sm text-white/70 leading-relaxed max-w-sm">
              {isSiteMaintenance
                ? 'Güvenlik ve performans için tüm dashboard servisleri geçici olarak durduruldu. Bakım tamamlandığında erişim otomatik olarak açılacak.'
                : 'Seçili modüller bakımda. İlgili özellikler geçici olarak kullanılamıyor, diğer her şey normal çalışıyor.'}
            </p>
            {siteUpdater && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={siteUpdater.avatarUrl} alt="avatar" className="h-5 w-5 rounded-full opacity-60" />
                <span className="text-xs text-white/40">Bakım sorumlusu: {siteUpdater.name}</span>
              </div>
            )}
          </div>

          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              {active.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 backdrop-blur-md"
                >
                  <p className="text-sm font-semibold text-amber-100">{LABELS[key] ?? key}</p>
                  {flags?.[key].reason && (
                    <p className="mt-0.5 text-xs text-amber-100/60">{flags[key].reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 hover:border-white/50"
            >
              Üye Paneli
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 bg-transparent px-6 py-3.5 text-sm font-bold text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
