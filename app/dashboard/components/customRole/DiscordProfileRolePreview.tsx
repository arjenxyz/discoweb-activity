'use client';

import Image from 'next/image';
import { discordColorToHex } from '@/lib/customRoles/types';
import { DiscordRoleOverflowPill, DiscordRolePill } from './DiscordRolePill';

type Props = {
  roleName: string;
  roleColor: string;
  roleIconUrl: string | null;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  about?: string | null;
};

/** Profilde görünen örnek roller — kullanıcının tasarımı ortada vurgulu */
const CONTEXT_ROLES: Array<{ name: string; color: string }> = [
  { name: 'data', color: '#1e8f8f' },
  { name: 'draft', color: '#c23b3b' },
  { name: 'artist', color: '#9b7bb8' },
];

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
    <div className="overflow-hidden rounded-lg border border-[#1e1f22] bg-[#313338] shadow-2xl">
      <div className="relative h-[94px] bg-[#4f545c]" />

      <div className="relative px-3 pb-3">
        <div className="-mt-[38px] mb-2">
          <div className="relative h-[80px] w-[80px] overflow-hidden rounded-full border-[6px] border-[#313338] bg-[#5865f2]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                {label.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-[4px] border-[#313338] bg-[#23a559]" />
          </div>
        </div>

        {about && (
          <div className="mb-2 rounded-md bg-[#111214] px-2 py-1.5 text-[13px] leading-snug text-[#dbdee1]">
            {about}
          </div>
        )}

        <h3 className="text-[20px] font-bold leading-tight text-[#f2f3f5]">{label}</h3>
        <p className="mt-0.5 text-[14px] text-[#b5bac1]">{username}</p>

        <div className="mt-3 rounded-md bg-[#2b2d31] p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#b5bac1] opacity-80">
            Spotify dinliyor
          </p>
          <p className="mt-1 truncate text-[13px] font-medium text-[#f2f3f5]">Örnek parça</p>
          <p className="text-[12px] text-[#b5bac1]">Sanatçı</p>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
            Roller
          </p>
          <div className="flex flex-wrap gap-1">
            {CONTEXT_ROLES.slice(0, 2).map((r) => (
              <DiscordRolePill key={r.name} name={r.name} colorHex={r.color} />
            ))}
            <DiscordRolePill
              name={showName}
              colorHex={hex}
              iconUrl={roleIconUrl}
              highlight
            />
            {CONTEXT_ROLES.slice(2).map((r) => (
              <DiscordRolePill key={r.name} name={r.name} colorHex={r.color} />
            ))}
            <DiscordRoleOverflowPill count={5} />
          </div>
        </div>

      </div>
    </div>
  );
}
