import type { SupabaseClient } from '@supabase/supabase-js';
import { logWebEvent } from '@/lib/serverLogger';

export type RedeemPromoSuccess = {
  ok: true;
  code: string;
  amount: number;
  balance: number;
  message: string;
};

export type RedeemPromoFailure = {
  ok: false;
  error: string;
  message: string;
  status: number;
};

export type RedeemPromoResult = RedeemPromoSuccess | RedeemPromoFailure;

type PromoRow = {
  id: string;
  code: string;
  value: number;
  status: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  server_id: string;
  created_by: string | null;
  created_by_username: string | null;
  created_by_avatar_url: string | null;
};

const fail = (error: string, message: string, status: number): RedeemPromoFailure => ({
  ok: false,
  error,
  message,
  status,
});

export async function redeemPromoCode(params: {
  supabase: SupabaseClient;
  userId: string;
  guildId: string;
  code: string;
  request?: Request;
}): Promise<RedeemPromoResult> {
  const { supabase, userId, guildId, code, request } = params;
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return fail('invalid_code', 'Promosyon kodu boş olamaz.', 400);
  }

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return fail('server_not_found', 'Sunucu bulunamadı.', 404);
  }

  const { data: promo, error: promoError } = await supabase
    .from('promotions')
    .select(
      'id,code,value,status,expires_at,max_uses,used_count,server_id,created_by,created_by_username,created_by_avatar_url',
    )
    .eq('server_id', server.id)
    .eq('code', normalizedCode)
    .is('deleted_at', null)
    .maybeSingle();

  if (promoError || !promo) {
    const { data: otherPromo } = await supabase
      .from('promotions')
      .select('id')
      .eq('code', normalizedCode)
      .is('deleted_at', null)
      .maybeSingle();

    if (otherPromo) {
      return fail('wrong_server', 'Bu promosyon kodu bu sunucuya ait değil.', 400);
    }
    return fail('invalid_code', 'Geçersiz promosyon kodu.', 404);
  }

  const promotion = promo as PromoRow;

  if (promotion.status !== 'active') {
    return fail('invalid_code', 'Bu promosyon kodu aktif değil.', 400);
  }

  if (promotion.expires_at && new Date(promotion.expires_at) <= new Date()) {
    return fail('expired', 'Promosyon kodunun süresi dolmuş.', 400);
  }

  if (promotion.max_uses && promotion.used_count >= promotion.max_uses) {
    return fail('usage_limit_exceeded', 'Promosyon kodunun kullanım limiti dolmuş.', 400);
  }

  const { data: existingUsage } = await supabase
    .from('promotion_usages')
    .select('id')
    .eq('promotion_id', promotion.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingUsage) {
    return fail('already_used', 'Bu promosyon kodunu zaten kullandınız.', 400);
  }

  const { error: usageError } = await supabase.from('promotion_usages').insert({
    promotion_id: promotion.id,
    user_id: userId,
  });

  if (usageError) {
    if (usageError.code === '23505') {
      return fail('already_used', 'Bu promosyon kodunu zaten kullandınız.', 400);
    }
    return fail('usage_failed', 'Promosyon kaydı oluşturulamadı.', 500);
  }

  let promoUpdate = supabase
    .from('promotions')
    .update({ used_count: promotion.used_count + 1 })
    .eq('id', promotion.id);

  if (promotion.max_uses) {
    promoUpdate = promoUpdate.lt('used_count', promotion.max_uses);
  }

  const { data: updatedPromo, error: promoUpdateError } = await promoUpdate
    .select('used_count')
    .maybeSingle();

  if (promoUpdateError || !updatedPromo) {
    await supabase
      .from('promotion_usages')
      .delete()
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId);
    return fail('usage_limit_exceeded', 'Promosyon kodunun kullanım limiti dolmuş.', 400);
  }

  const packageAmount = Number(promotion.value);
  if (!Number.isFinite(packageAmount) || packageAmount <= 0) {
    return fail('invalid_code', 'Promosyon değeri geçersiz.', 500);
  }

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentBalance = Number(wallet?.balance ?? 0);
  const newBalance = Number((currentBalance + packageAmount).toFixed(2));

  const { error: walletError } = await supabase.from('member_wallets').upsert(
    {
      guild_id: guildId,
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  if (walletError) {
    await supabase
      .from('promotion_usages')
      .delete()
      .eq('promotion_id', promotion.id)
      .eq('user_id', userId);
    await supabase
      .from('promotions')
      .update({ used_count: promotion.used_count })
      .eq('id', promotion.id);
    return fail('wallet_update_failed', 'Cüzdan güncellenirken hata oluştu.', 500);
  }

  await supabase.from('wallet_ledger').insert({
    guild_id: guildId,
    user_id: userId,
    amount: packageAmount,
    type: 'promotion',
    balance_after: newBalance,
    metadata: { promoId: promotion.id, code: promotion.code },
  });

  const promoTitle = 'Promosyon kodu kullanıldı';
  const promoBody = [
    `${promotion.code} kodu başarıyla kullanıldı.`,
    `${packageAmount} Papel hesabınıza eklendi.`,
    `Yeni bakiye: ${newBalance} Papel`,
  ].join('\n');

  await Promise.all([
    supabase.from('system_mails').insert({
      guild_id: guildId,
      user_id: userId,
      title: promoTitle,
      body: promoBody,
      category: 'system',
      status: 'published',
      author_name: 'DiscoWeb',
      metadata: {
        kind: 'promotion',
        i18nKey: 'promotion',
        promoId: promotion.id,
        code: promotion.code,
        amount: packageAmount,
        balanceAfter: newBalance,
        createdBy: promotion.created_by,
        createdByUsername: promotion.created_by_username,
        createdByAvatarUrl: promotion.created_by_avatar_url,
      },
    }),
    supabase.from('notifications').insert({
      guild_id: guildId,
      title: promoTitle,
      body: promoBody,
      type: 'mail',
      status: 'published',
      target_user_id: userId,
    }),
  ]);

  if (request) {
    await logWebEvent(request, {
      event: 'promo_redeem',
      status: 'success',
      userId,
      guildId,
      metadata: {
        promoId: promotion.id,
        code: promotion.code,
        value: promotion.value,
        balanceAfter: newBalance,
      },
    });
  }

  return {
    ok: true,
    code: promotion.code,
    amount: packageAmount,
    balance: newBalance,
    message: `${packageAmount} Papel hesabınıza eklendi!`,
  };
}

export function mapPromoErrorForClient(error: string): string {
  if (error === 'limit_reached') return 'usage_limit_exceeded';
  if (error === 'wallet_failed') return 'wallet_update_failed';
  if (error === 'server_not_found') return 'profile_not_found';
  return error;
}
