import type { SupabaseClient } from '@supabase/supabase-js';

export type EarnMailKind = 'earn_claim' | 'earn_rejected';

export type EarnRejectReason = 'claim_failed' | 'wallet_failed' | 'settle_failed';

type InsertEarnMailParams = {
  guildId: string | null;
  userId: string;
  kind: EarnMailKind;
  total?: number;
  messageTotal?: number;
  voiceTotal?: number;
  rowCount?: number;
  reason?: EarnRejectReason | string | null;
  authorName?: string;
};

const TITLE_FALLBACK: Record<EarnMailKind, string> = {
  earn_claim: 'Kazançlarınız hesabınıza tanımlandı',
  earn_rejected: 'Kazançlarınız hesabınıza tanımlanmadı',
};

/** Structured earn claim mail — UI localizes via metadata.kind */
export async function insertEarnMail(
  supabase: SupabaseClient,
  params: InsertEarnMailParams,
): Promise<{ ok: boolean; error?: string }> {
  const {
    guildId,
    userId,
    kind,
    total = 0,
    messageTotal = 0,
    voiceTotal = 0,
    rowCount = 0,
    reason = null,
    authorName = 'DiscoWeb',
  } = params;

  const bodyLines =
    kind === 'earn_claim'
      ? [
          `Toplam: ${total} Papel`,
          `Mesaj: ${messageTotal} Papel`,
          `Ses: ${voiceTotal} Papel`,
        ]
      : [
          `Durum: tanımlanmadı`,
          reason ? `Sebep: ${reason}` : '',
          total > 0 ? `Tutar: ${total} Papel` : '',
        ].filter(Boolean);

  const { error } = await supabase.from('system_mails').insert({
    guild_id: guildId,
    user_id: userId,
    title: TITLE_FALLBACK[kind],
    body: bodyLines.join('\n'),
    category: 'system',
    status: 'published',
    author_name: authorName,
    created_at: new Date().toISOString(),
    metadata: {
      kind,
      i18nKey: kind,
      total,
      messageTotal,
      voiceTotal,
      rowCount,
      reason: reason ?? null,
      status: kind === 'earn_claim' ? 'credited' : 'rejected',
    },
  });

  if (error) {
    console.error('[earnMail] insert failed', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
