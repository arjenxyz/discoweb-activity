'use client';

import Image from 'next/image';
import { discordColorToHex } from '@/lib/customRoles/types';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  roleName: string;
  roleColor: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  showHierarchyWarning?: boolean;
};

export default function DiscordRolePreview({
  roleName,
  roleColor,
  username,
  displayName,
  avatarUrl,
  showHierarchyWarning = true,
}: Props) {
  const t = useT();
  const hex = roleColor.startsWith('#') ? roleColor : discordColorToHex(parseInt(roleColor, 10) || 0x5865f2);
  const label = displayName || username;

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('custom_role_preview_title')}</p>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#313338]">
        <div className="border-b border-[#1e1f22] px-3 py-2 text-[11px] font-semibold text-[#b5bac1]">
          {t('custom_role_preview_members')}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 hover:bg-[#35373c]">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#5865f2]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                {label.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#f2f3f5]">{label}</p>
            <span
              className="mt-0.5 inline-flex max-w-full items-center rounded px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${hex}33`, color: hex }}
            >
              {roleName}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#313338]">
        <div className="border-b border-[#1e1f22] px-3 py-2 text-[11px] font-semibold text-[#b5bac1]">
          # genel-sohbet
        </div>
        <div className="space-y-3 px-3 py-3">
          <div className="flex gap-3">
            <div className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#5865f2]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {label.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold" style={{ color: hex }}>
                  {label}
                </span>
                <span
                  className="rounded px-1 text-[10px] font-medium text-[#949ba4]"
                  style={{ backgroundColor: `${hex}22` }}
                >
                  {roleName}
                </span>
                <span className="text-[10px] text-[#949ba4]">Bugün 14:32</span>
              </div>
              <p className="mt-1 text-sm text-[#dbdee1]">Çekilişi kazandım, teşekkürler!</p>
            </div>
          </div>
        </div>
      </div>

      {showHierarchyWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200/90 leading-relaxed">
          {t('custom_role_hierarchy_warning')}
        </div>
      )}
    </div>
  );
}
