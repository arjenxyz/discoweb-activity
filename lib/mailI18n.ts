export type MailLike = {
  title?: string | null;
  body?: string | null;
  metadata?: unknown;
};

export type MailT = (key: string, vars?: Record<string, string | number>) => string;

const asRecord = (raw: unknown): Record<string, unknown> => {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
};

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
};

/** Resolve stable template id from metadata / legacy titles. */
export function resolveMailTemplateId(mail: MailLike): string | null {
  const meta = asRecord(mail.metadata);
  const explicit = str(meta.i18nKey) ?? str(meta.template) ?? str(meta.kind) ?? str(meta.source);
  if (explicit) {
    if (explicit === 'transfer') return 'transfer';
    if (explicit === 'promotion' || explicit === 'promo') return 'promotion';
    if (explicit === 'discount') return 'discount';
    if (explicit === 'order' || explicit === 'order_receipt' || explicit === 'order_confirmed') {
      return 'order_confirmed';
    }
    if (explicit === 'order_rejected' || explicit === 'order_failed') return 'order_rejected';
    if (explicit === 'earn_rejected' || explicit === 'earn_failed') return 'earn_rejected';
    if (explicit === 'earn_claim' || explicit === 'earn' || explicit === 'claim') return 'earn_claim';
    if (explicit === 'quiz_reward') return 'quiz_reward';
    if (explicit === 'quiz_motivation') return 'quiz_motivation';
    if (explicit === 'earn_settings' || explicit === 'economy_update') return 'earn_settings';
    if (
      explicit === 'activity_welcome' ||
      explicit === 'activity_welcome_back' ||
      explicit === 'welcome' ||
      explicit === 'welcome_first_login'
    ) {
      return 'activity_welcome';
    }
    if (explicit.startsWith('mail_title_')) return explicit.replace(/^mail_title_/, '');
  }

  const title = mail.title ?? '';
  if (/papel\s*transfer/i.test(title)) return 'transfer';
  if (/promosyon\s*kodu\s*kullanıldı/i.test(title) || /promo(tion)?\s*code\s*(used|redeemed)/i.test(title)) {
    return 'promotion';
  }
  if (/yeni\s+indirim/i.test(title) || /özel\s+promosyon\s*kodu/i.test(title) || /discount\s*code/i.test(title)) {
    return 'discount';
  }
  if (
    /sipari[sş].*(red|hata|ba[sş]ar[iı]s[iı]z|kesinti)/i.test(title) ||
    /order\s*(reject|fail|denied)/i.test(title) ||
    /i[sş]lem\s*kesinti/i.test(title) ||
    /bakiye\s*yetersiz/i.test(title) ||
    /sat[iı]n\s*alma\s*ba[sş]ar[iı]s[iı]z/i.test(title)
  ) {
    return 'order_rejected';
  }
  if (/sipari[sş]\s*onay/i.test(title) || /order\s*confirm/i.test(title)) return 'order_confirmed';
  if (
    /kazançlar[iı]n[iı]z.*tan[iı]mlanmad[iı]/i.test(title) ||
    /earnings?\s*(not\s*credited|failed|rejected)/i.test(title)
  ) {
    return 'earn_rejected';
  }
  if (
    /kazançlar[iı]n[iı]z.*tan[iı]mland[iı]/i.test(title) ||
    /earnings?\s*(credited|claimed)/i.test(title)
  ) {
    return 'earn_claim';
  }
  if (/papel\s*kazand[iı]n[iı]z/i.test(title) || /papel\s*earned/i.test(title)) return 'quiz_reward';
  if (/kat[iı]ld[iı][gğ][iı]n\s*i[cç]in\s*te[sş]ekk[uü]r/i.test(title) || /thanks?\s*for\s*(joining|participating)/i.test(title)) {
    return 'quiz_motivation';
  }

  // Structured metadata without kind
  if (meta.status === 'rejected' || meta.status === 'failed') {
    if (meta.message_total != null || meta.voice_total != null || meta.messageTotal != null) {
      return 'earn_rejected';
    }
    return 'order_rejected';
  }
  if (meta.order_id || meta.orderId || Array.isArray(meta.items)) return 'order_confirmed';
  if (meta.message_total != null || meta.voice_total != null || meta.messageTotal != null) {
    return 'earn_claim';
  }
  if (typeof meta.percent === 'number' && str(meta.code)) return 'discount';
  if (meta.quiz_title || meta.event_id) {
    const earned = typeof meta.total_earned === 'number' ? meta.total_earned : Number(meta.total_earned ?? 0);
    return earned > 0 ? 'quiz_reward' : 'quiz_motivation';
  }
  if (meta.groups && typeof meta.groups === 'object') {
    return 'earn_settings';
  }
  if (Array.isArray(meta.summaryLines) && meta.summaryLines.length > 0) {
    return 'earn_settings';
  }

  return null;
}

const TITLE_KEYS: Record<string, string> = {
  transfer: 'mail_title_transfer_received',
  promotion: 'mail_title_promo_redeemed',
  discount: 'mail_title_discount_new',
  order: 'mail_title_order_confirmed',
  order_confirmed: 'mail_title_order_confirmed',
  order_rejected: 'mail_title_order_rejected',
  earn_claim: 'mail_title_earn_claimed',
  earn_rejected: 'mail_title_earn_rejected',
  quiz_reward: 'mail_title_quiz_reward',
  quiz_motivation: 'mail_title_quiz_motivation',
  earn_settings: 'mail_title_earn_settings',
  activity_welcome: 'mail_title_welcome',
};

const PREVIEW_KEYS: Record<string, string> = {
  transfer: 'mail_preview_transfer',
  promotion: 'mail_preview_promo',
  discount: 'mail_preview_discount',
  order: 'mail_preview_order',
  order_confirmed: 'mail_preview_order',
  order_rejected: 'mail_preview_order_rejected',
  earn_claim: 'mail_preview_earn_claim',
  earn_rejected: 'mail_preview_earn_rejected',
  quiz_reward: 'mail_preview_quiz_reward',
  quiz_motivation: 'mail_preview_quiz_motivation',
  earn_settings: 'mail_preview_earn_settings',
  activity_welcome: 'mail_preview_welcome',
};

export function resolveMailTitle(mail: MailLike, t: MailT): string {
  const template = resolveMailTemplateId(mail);
  if (!template) return mail.title ?? '';

  const meta = asRecord(mail.metadata);
  const eventTitle = str(meta.quiz_title) ?? str(meta.event_title) ?? '';

  if (template === 'quiz_reward') {
    const amount = meta.total_earned ?? meta.totalEarn ?? '';
    const translated = t('mail_title_quiz_reward', {
      title: eventTitle || 'Quiz',
      amount: String(amount),
    });
    return translated === 'mail_title_quiz_reward' ? (mail.title ?? '') : translated;
  }

  if (template === 'quiz_motivation') {
    const translated = t('mail_title_quiz_motivation', {
      title: eventTitle || 'Quiz',
    });
    return translated === 'mail_title_quiz_motivation' ? (mail.title ?? '') : translated;
  }

  if (template === 'activity_welcome') {
    const returning = str(meta.variant) === 'returning';
    const key = returning ? 'mail_title_welcome_back' : 'mail_title_welcome';
    const translated = t(key);
    return translated === key ? (mail.title ?? '') : translated;
  }

  const key = TITLE_KEYS[template];
  if (!key) return mail.title ?? '';

  const translated = t(key);
  return translated === key ? (mail.title ?? '') : translated;
}

export function resolveMailPreview(mail: MailLike, t: MailT, maxLen = 120): string {
  const template = resolveMailTemplateId(mail);
  const meta = asRecord(mail.metadata);

  if (template === 'transfer') {
    const amount = meta.amount ?? '';
    const sender = str(meta.senderUsername) ?? str(meta.sender_username) ?? '';
    return t('mail_preview_transfer', {
      amount: String(amount),
      sender: sender || t('mail_detail_sender_label'),
    });
  }

  if (template === 'promotion') {
    return t('mail_preview_promo', {
      amount: String(meta.amount ?? ''),
      code: String(str(meta.code) ?? ''),
    });
  }

  if (template === 'discount') {
    return t('mail_preview_discount', {
      percent: String(meta.percent ?? ''),
      code: String(str(meta.code) ?? ''),
    });
  }

  if (template === 'order' || template === 'order_confirmed') {
    return t('mail_preview_order', {
      total: String(meta.total ?? ''),
      orderId: String(meta.order_id ?? meta.orderId ?? ''),
    });
  }

  if (template === 'order_rejected') {
    return t('mail_preview_order_rejected', {
      orderId: String(meta.order_id ?? meta.orderId ?? ''),
    });
  }

  if (template === 'earn_claim') {
    const total = meta.total ?? meta.totalTransferred ?? '';
    return t('mail_preview_earn_claim', { amount: String(total) });
  }

  if (template === 'earn_rejected') {
    return t('mail_preview_earn_rejected');
  }

  if (template === 'quiz_reward') {
    return t('mail_preview_quiz_reward', {
      amount: String(meta.total_earned ?? ''),
      title: String(str(meta.quiz_title) ?? ''),
    });
  }

  if (template === 'quiz_motivation') {
    return t('mail_preview_quiz_motivation', {
      title: String(str(meta.quiz_title) ?? ''),
    });
  }

  if (template === 'earn_settings') {
    return t('mail_preview_earn_settings');
  }

  if (template === 'activity_welcome') {
    const returning = str(meta.variant) === 'returning';
    return returning ? t('mail_preview_welcome_back') : t('mail_preview_welcome');
  }

  if (template && PREVIEW_KEYS[template]) {
    const translated = t(PREVIEW_KEYS[template]);
    if (translated !== PREVIEW_KEYS[template]) return translated.slice(0, maxLen);
  }

  // Fallback: strip HTML from body
  const body = (mail.body ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen - 1)}…`;
}

export function getMailMeta(mail: MailLike): Record<string, unknown> {
  return asRecord(mail.metadata);
}
