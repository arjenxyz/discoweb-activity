'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  LuImagePlus,
  LuPalette,
  LuSend,
  LuShield,
  LuSparkles,
  LuTrash2,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useT } from '@/contexts/LocaleContext';
import type { MemberProfile } from '../../types';
import type { CustomRoleRequestRow } from '@/lib/customRoles/types';
import { CUSTOM_ROLE_ICON_MAX_BYTES } from '@/lib/customRoles/types';
import { fileToDataUrl, validateRoleIconDataUrl } from '@/lib/customRoles/iconValidate';
import DiscordProfileRolePreview from './DiscordProfileRolePreview';

type Props = {
  profile?: MemberProfile | null;
  onBack?: () => void;
};

export default function CustomRolePage({ profile }: Props) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#5865F2');
  const [roleIconUrl, setRoleIconUrl] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [hoist, setHoist] = useState(false);
  const [mentionable, setMentionable] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [requests, setRequests] = useState<CustomRoleRequestRow[]>([]);

  const statusLabel = (status: string) => {
    const mapped: Record<string, string> = {
      pending: t('custom_role_status_pending'),
      active: t('custom_role_status_active'),
      rejected: t('custom_role_status_rejected'),
      expired: t('custom_role_status_expired'),
      cancelled: t('custom_role_status_cancelled'),
    };
    return mapped[status] ?? status;
  };

  const loadRequests = useCallback(() => {
    fetchWithCreds('/api/member/custom-role-requests')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setRequests(d.requests ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onPickIcon = async (file: File | null) => {
    setIconError(null);
    if (!file) return;
    if (file.size > CUSTOM_ROLE_ICON_MAX_BYTES) {
      setIconError(t('custom_role_icon_error_size'));
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      setIconError(t('custom_role_icon_error_type'));
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const check = validateRoleIconDataUrl(dataUrl);
      if (!check.ok) {
        setIconError(t('custom_role_icon_error_invalid'));
        return;
      }
      setRoleIconUrl(dataUrl);
    } catch {
      setIconError(t('custom_role_icon_error_read'));
    }
  };

  const submit = async () => {
    if (!roleIconUrl) {
      setStatus({ type: 'error', message: t('custom_role_icon_required') });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetchWithCreds('/api/member/custom-role-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: roleName,
          role_color: roleColor,
          role_icon_url: roleIconUrl,
          hoist,
          mentionable,
          requester_note: note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.error === 'pending_limit'
            ? t('custom_role_error_pending_limit')
            : data.error === 'icon_required'
              ? t('custom_role_icon_required')
              : data.error === 'too_large'
                ? t('custom_role_icon_error_size')
                : t('custom_role_error_submit');
        setStatus({ type: 'error', message: msg });
        return;
      }
      setStatus({ type: 'success', message: t('custom_role_submit_success') });
      setRoleName('');
      setNote('');
      setRoleIconUrl(null);
      loadRequests();
    } catch {
      setStatus({ type: 'error', message: t('custom_role_error_submit') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-[#0e1018] to-violet-950/30 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
            <LuSparkles className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {t('custom_role_title')}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
              {t('custom_role_subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 sm:p-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('custom_role_name_label')}
            </label>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value.slice(0, 100))}
              placeholder={t('custom_role_name_placeholder')}
              className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('custom_role_icon_label')}
            </label>
            <p className="mt-1 text-xs text-slate-500">{t('custom_role_icon_hint')}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPickIcon(e.target.files?.[0] ?? null)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900/50 transition hover:border-indigo-500/50 hover:bg-indigo-500/5"
              >
                {roleIconUrl ? (
                  <Image
                    src={roleIconUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <LuImagePlus className="h-8 w-8 text-slate-500" />
                )}
              </button>
              {roleIconUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleIconUrl(null);
                    setIconError(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-rose-400"
                >
                  <LuTrash2 className="h-3.5 w-3.5" />
                  {t('custom_role_icon_remove')}
                </button>
              )}
            </div>
            {iconError && <p className="mt-2 text-xs text-rose-400">{iconError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('custom_role_color_label')}
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="color"
                value={roleColor}
                onChange={(e) => setRoleColor(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
              />
              <span className="font-mono text-sm text-slate-400">{roleColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={hoist}
                onChange={(e) => setHoist(e.target.checked)}
                className="rounded border-slate-600"
              />
              {t('custom_role_hoist')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={mentionable}
                onChange={(e) => setMentionable(e.target.checked)}
                className="rounded border-slate-600"
              />
              {t('custom_role_mentionable')}
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('custom_role_note_label')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t('custom_role_note_placeholder')}
              className="mt-2 w-full resize-none rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-200/80">
            <LuShield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            {t('custom_role_admin_review_hint')}
          </div>

          {status && (
            <p
              className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {status.message}
            </p>
          )}

          <button
            type="button"
            disabled={submitting || !roleName.trim() || !roleIconUrl}
            onClick={() => void submit()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-600 disabled:opacity-40"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LuSend className="h-4 w-4" />
            )}
            {t('custom_role_submit')}
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t('custom_role_preview_profile')}
          </p>
          <DiscordProfileRolePreview
            roleName={roleName}
            roleColor={roleColor}
            roleIconUrl={roleIconUrl}
            username={profile?.username ?? 'kullanici'}
            displayName={profile?.displayName ?? profile?.nickname}
            avatarUrl={profile?.avatarUrl ?? null}
            about={profile?.about ?? null}
          />
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
            {t('custom_role_hierarchy_warning')}
          </div>
        </div>
      </div>

      {requests.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <LuPalette className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-semibold text-white">{t('custom_role_my_requests')}</p>
          </div>
          <ul className="divide-y divide-slate-800/80">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {r.role_icon_url ? (
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                      <Image src={r.role_icon_url} alt="" fill className="object-cover" unoptimized />
                    </span>
                  ) : (
                    <span
                      className="h-8 w-8 shrink-0 rounded-full"
                      style={{
                        backgroundColor: `#${(r.role_color & 0xffffff).toString(16).padStart(6, '0')}`,
                      }}
                    />
                  )}
                  <span className="truncate text-sm text-slate-200">{r.role_name}</span>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {statusLabel(r.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
