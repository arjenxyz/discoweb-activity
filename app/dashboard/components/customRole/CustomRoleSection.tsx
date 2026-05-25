'use client';

import { useCallback, useEffect, useState } from 'react';
import { LuPalette, LuSend, LuShield } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useT } from '@/contexts/LocaleContext';
import type { MemberProfile } from '../../types';
import type { CustomRoleRequestRow } from '@/lib/customRoles/types';
import DiscordRolePreview from './DiscordRolePreview';

const CARD = 'rounded-2xl border border-slate-800 bg-slate-900/40';
const CARD_PAD = 'p-4 sm:p-5';

type Props = {
  profile?: MemberProfile | null;
};

export default function CustomRoleSection({ profile }: Props) {
  const t = useT();

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
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#5865F2');
  const [roleEmoji, setRoleEmoji] = useState('');
  const [hoist, setHoist] = useState(false);
  const [mentionable, setMentionable] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [requests, setRequests] = useState<CustomRoleRequestRow[]>([]);

  const previewName = roleEmoji.trim()
    ? `${roleEmoji.trim()} ${roleName.trim()}`.trim()
    : roleName.trim() || 'Örnek Rol';

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

  const submit = async () => {
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetchWithCreds('/api/member/custom-role-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: roleName,
          role_color: roleColor,
          role_emoji: roleEmoji,
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
            : data.error === 'invalid_emoji'
              ? t('custom_role_error_invalid_emoji')
              : t('custom_role_error_submit');
        setStatus({ type: 'error', message: msg });
        return;
      }
      setStatus({ type: 'success', message: t('custom_role_submit_success') });
      setRoleName('');
      setNote('');
      loadRequests();
    } catch {
      setStatus({ type: 'error', message: t('custom_role_error_submit') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">{t('custom_role_title')}</h3>
        <p className="mt-1 text-sm text-slate-400">{t('custom_role_subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className={`${CARD} ${CARD_PAD} space-y-4`}>
          <div>
            <label className="text-xs font-medium text-slate-500">{t('custom_role_name_label')}</label>
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value.slice(0, 100))}
              placeholder={t('custom_role_name_placeholder')}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500">{t('custom_role_color_label')}</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={roleColor}
                  onChange={(e) => setRoleColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
                />
                <span className="font-mono text-xs text-slate-400">{roleColor}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">{t('custom_role_emoji_label')}</label>
              <input
                value={roleEmoji}
                onChange={(e) => setRoleEmoji(e.target.value.slice(0, 2))}
                placeholder="🎉"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={hoist} onChange={(e) => setHoist(e.target.checked)} className="rounded" />
              {t('custom_role_hoist')}
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={mentionable}
                onChange={(e) => setMentionable(e.target.checked)}
                className="rounded"
              />
              {t('custom_role_mentionable')}
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">{t('custom_role_note_label')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t('custom_role_note_placeholder')}
              className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
            <LuShield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
            {t('custom_role_admin_review_hint')}
          </div>

          {status && (
            <p className={`text-sm font-medium ${status.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {status.message}
            </p>
          )}

          <button
            type="button"
            disabled={submitting || !roleName.trim()}
            onClick={() => void submit()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:opacity-40"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <LuSend className="h-4 w-4" />
            )}
            {t('custom_role_submit')}
          </button>
        </div>

        <div className={`${CARD} ${CARD_PAD}`}>
          <DiscordRolePreview
            roleName={previewName}
            roleColor={roleColor}
            username={profile?.username ?? 'kullanici'}
            displayName={profile?.displayName ?? profile?.nickname}
            avatarUrl={profile?.avatarUrl ?? null}
          />
        </div>
      </div>

      {requests.length > 0 && (
        <div className={`${CARD} ${CARD_PAD}`}>
          <div className="mb-3 flex items-center gap-2">
            <LuPalette className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-medium text-white">{t('custom_role_my_requests')}</p>
          </div>
          <ul className="divide-y divide-slate-800">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <span className="truncate text-sm text-slate-300">{r.role_name}</span>
                <span className="shrink-0 text-xs text-slate-500">{statusLabel(r.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
