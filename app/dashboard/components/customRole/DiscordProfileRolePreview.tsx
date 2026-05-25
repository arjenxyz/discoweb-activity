'use client';

import Image from 'next/image';
import { LuPlus, LuX } from 'react-icons/lu';
import { discordColorToHex } from '@/lib/customRoles/types';

type Props = {
  roleName: string;
  roleColor: string;
  roleIconUrl: string | null;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  about?: string | null;
};

export default function DiscordProfileRolePreview({
  roleName,
  roleColor,
  roleIconUrl,
  username,
  displayName,
  avatarUrl,
  about,
}: Props) {
  const hex = roleColor.startsWith('#')
    ? roleColor
    : discordColorToHex(parseInt(roleColor, 10) || 0x5865f2);
  const label = displayName || username;
  const showName = roleName.trim() || 'Örnek Rol';

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e1f22] bg-[#313338] shadow-2xl">
      <div className="relative h-24 bg-gradient-to-br from-[#4f545c] to-[#2b2d31]" />

      <div className="relative px-4 pb-4">
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-[5px] border-[#313338] bg-[#5865f2]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                {label.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-[#313338] bg-[#23a559]" />
          </div>
        </div>

        {about && (
          <div className="mb-3 max-w-[90%] rounded-lg bg-[#111214] px-3 py-2 text-xs text-[#dbdee1]">
            {about}
          </div>
        )}

        <h3 className="text-xl font-bold text-[#f2f3f5]">{label}</h3>
        <p className="text-sm text-[#b5bac1]">
          {username}
          <span className="text-[#949ba4]"> • üye</span>
        </p>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#b5bac1]">
            Roller
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#41434a] py-1 pl-1 pr-1.5 text-[13px] font-medium text-[#f2f3f5]"
              style={{ borderLeft: `3px solid ${hex}` }}
            >
              {roleIconUrl ? (
                <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
                  <Image src={roleIconUrl} alt="" fill className="object-cover" unoptimized />
                </span>
              ) : (
                <span
                  className="h-5 w-5 shrink-0 rounded-full"
                  style={{ backgroundColor: hex }}
                />
              )}
              <span className="truncate">{showName}</span>
              <LuX className="h-3.5 w-3.5 shrink-0 text-[#b5bac1]/80" aria-hidden />
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#41434a] text-[#b5bac1]">
              <LuPlus className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[#949ba4]">
          Önizleme, Discord profilindeki rol görünümünü yansıtır. Onay sonrası rol sunucuda oluşturulur.
        </p>
      </div>
    </div>
  );
}
