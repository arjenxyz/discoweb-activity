'use client';

import Image from 'next/image';

/** Discord profil kartındaki rol pill — dot | isim | ikon (sağda) */
export type DiscordRolePillProps = {
  name: string;
  colorHex: string;
  iconUrl?: string | null;
  /** Tasarım önizlemesinde vurgu */
  highlight?: boolean;
};

export function DiscordRolePill({ name, colorHex, iconUrl, highlight }: DiscordRolePillProps) {
  return (
    <span
      className={`inline-flex h-[22px] max-w-full shrink-0 items-center rounded-[11px] bg-[#4e5058] text-[12px] font-medium leading-[14px] text-[#f2f3f5] ${
        highlight ? 'ring-1 ring-[#5865f2] ring-offset-1 ring-offset-[#313338]' : ''
      }`}
    >
      <span
        className="ml-1 h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: colorHex }}
        aria-hidden
      />
      <span className="mx-1 min-w-0 truncate">{name}</span>
      {iconUrl ? (
        <span className="relative mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <Image
            src={iconUrl}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain"
            unoptimized
          />
        </span>
      ) : null}
    </span>
  );
}

export function DiscordRoleOverflowPill({ count = 5 }: { count?: number }) {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-[11px] bg-[#4e5058] px-2 text-[12px] font-medium leading-[14px] text-[#b5bac1]">
      +{count}
    </span>
  );
}
