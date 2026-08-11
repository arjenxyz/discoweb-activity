import type { SupabaseClient } from '@supabase/supabase-js';

export type OrderMailItem = {
  title: string;
  qty: number;
  price: number;
  total: number;
};

export type OrderMailKind = 'order_confirmed' | 'order_rejected';

export type OrderRejectReason =
  | 'role_assign_failed'
  | 'insufficient_funds'
  | 'rollback_failed'
  | 'purchase_failed'
  | 'delivery_failed';

type InsertOrderMailParams = {
  guildId: string | null;
  userId: string;
  kind: OrderMailKind;
  orderId?: string | null;
  items?: OrderMailItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  /** Required Papel when insufficient funds */
  required?: number;
  available?: number;
  reason?: OrderRejectReason | string | null;
  refundUrl?: string | null;
  authorName?: string;
};

const TITLE_FALLBACK: Record<OrderMailKind, string> = {
  order_confirmed: 'Sipariş onayı',
  order_rejected: 'Sipariş reddedildi',
};

/** Structured order mail — UI localizes via metadata.kind */
export async function insertOrderMail(
  supabase: SupabaseClient,
  params: InsertOrderMailParams,
): Promise<{ ok: boolean; error?: string }> {
  const {
    guildId,
    userId,
    kind,
    orderId = null,
    items = [],
    subtotal = 0,
    discount = 0,
    total = 0,
    required,
    available,
    reason = null,
    refundUrl = null,
    authorName = 'DiscoWeb',
  } = params;

  const bodyLines =
    kind === 'order_confirmed'
      ? [
          `Sipariş No: ${orderId ?? '—'}`,
          `Toplam: ${total} Papel`,
          `Ürün: ${items.map((i) => `${i.title} x${i.qty}`).join(', ') || '—'}`,
        ]
      : [
          `Sipariş No: ${orderId ?? '—'}`,
          `Durum: reddedildi`,
          reason ? `Sebep: ${reason}` : '',
          total > 0 ? `Tutar: ${total} Papel` : '',
        ].filter(Boolean);

  const { error } = await supabase.from('system_mails').insert({
    guild_id: guildId,
    user_id: userId,
    title: TITLE_FALLBACK[kind],
    body: bodyLines.join('\n'),
    category: 'order',
    status: 'published',
    author_name: authorName,
    created_at: new Date().toISOString(),
    metadata: {
      kind,
      i18nKey: kind,
      order_id: orderId,
      items,
      subtotal,
      discount,
      total,
      required: required ?? null,
      available: available ?? null,
      reason: reason ?? null,
      refundUrl: refundUrl ?? null,
      status: kind === 'order_confirmed' ? 'confirmed' : 'rejected',
    },
  });

  if (error) {
    console.error('[orderMail] insert failed', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
