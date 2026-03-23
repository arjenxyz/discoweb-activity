'use client';

import Image from 'next/image';
import type { MemberProfile } from '../types';
import { useT } from '@/contexts/LocaleContext';

type ProfileSectionProps = {
  profileLoading: boolean;
  profileError: string | null;
  unauthorized: boolean;
  profile: MemberProfile | null;
  formatRoleColor: (color: number) => string;
};

export default function ProfileSection({
  profileLoading,
  profileError,
  unauthorized,
  profile,
  formatRoleColor,
}: ProfileSectionProps) {
  const t = useT();
  return (
    <section className="grid gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">{t('profile_section_label')}</p>
        <h1 className="mt-2 text-2xl font-semibold">{t('profile_welcome')}</h1>
        <p className="mt-1 text-sm text-white/60">{t('profile_subtitle')}</p>

        {profileLoading ? (
          <p className="mt-4 text-sm text-white/60">{t('profile_loading')}</p>
        ) : profileError ? (
          <p className="mt-4 text-sm text-rose-300">{profileError}</p>
        ) : unauthorized ? (
          <p className="mt-4 text-sm text-white/60">{t('profile_login_required')}</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-[auto_1fr]">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
              {profile?.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt="avatar"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-white/50">?</div>
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">
                {profile?.nickname ?? profile?.displayName ?? profile?.username}
              </p>
              <p className="text-sm text-white/50">@{profile?.username}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.roles?.length ? (
                  profile.roles.map((role) => (
                    <span
                      key={role.id}
                      className="role-glow rounded-full border border-white/10 px-2 py-1 text-[11px] transition hover:scale-[1.03]"
                      style={{
                        borderColor: `${formatRoleColor(role.color)}55`,
                        color: formatRoleColor(role.color),
                        ['--role-color' as string]: `${formatRoleColor(role.color)}66`,
                        ['--role-color-soft' as string]: `${formatRoleColor(role.color)}22`,
                      }}
                    >
                      {role.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white/40">{t('profile_no_roles')}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
