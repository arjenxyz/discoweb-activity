import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { logWebEvent } from '@/lib/serverLogger';
import { discordFetch } from '@/lib/discordRest';
import { requireSessionUser } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? null;

const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID; // Fallback to default
};

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getBalance = async (supabase: SupabaseClient, userId: string, guildId: string) => {
  const { data } = (await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle()) as unknown as { data: { balance?: unknown } | null };

  const raw = data?.balance ?? 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return n;
};

const setBalance = async (supabase: SupabaseClient, userId: string, guildId: string, balance: number) => {
  await (supabase.from('member_wallets') as unknown as {
    upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => Promise<unknown>;
  }).upsert(
    {
      guild_id: guildId,
      user_id: userId,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );
};

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site', 'store']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;

  const selectedGuildId = await getSelectedGuildId();

  const payload = (await request.json()) as { itemId?: string; discountCode?: string };
  if (!payload.itemId) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  const { data: item, error: itemError } = await supabase
    .from('store_items')
    .select('id,title,price,role_id,duration_days,status')
    .eq('id', payload.itemId)
    .eq('server_id', server.id)
    .eq('status', 'active')
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: 'item_not_found' }, { status: 404 });
  }

  if (!item.role_id) {
    return NextResponse.json({ error: 'missing_role' }, { status: 400 });
  }

  let finalPrice = Number(item.price);
  let appliedDiscount = null;
  let discountAmount = 0;

  // Check discount code if provided
  if (payload.discountCode) {
    const { data: discount, error: discountError } = await supabase
      .from('store_discounts')
      .select('*')
      .eq('server_id', server.id)
      .eq('code', payload.discountCode.toUpperCase())
      .eq('status', 'active')
      .is('expires_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single();

    if (discountError || !discount) {
      return NextResponse.json({ error: 'invalid_discount_code' }, { status: 400 });
    }

    // Check usage limit
    if (discount.max_uses && discount.used_count >= discount.max_uses) {
      return NextResponse.json({ error: 'discount_code_expired' }, { status: 400 });
    }

    // Check if user already used this discount
    const { data: existingUsage } = await supabase
      .from('discount_usages')
      .select('id')
      .eq('discount_id', discount.id)
      .eq('user_id', userId)
      .single();

    if (existingUsage) {
      return NextResponse.json({ error: 'discount_already_used' }, { status: 400 });
    }

    // Apply discount
    discountAmount = (finalPrice * discount.percent) / 100;
    finalPrice = finalPrice - discountAmount;
    appliedDiscount = discount;
  }

  const currentBalance = await getBalance(supabase, userId, selectedGuildId);
  console.log('Purchase debug:', { userId, selectedGuildId, finalPrice, currentBalance });

  if (!Number.isFinite(currentBalance) || currentBalance < finalPrice) {
    // Friendly user-facing message and inbox notification
    try {
      await supabase.from('system_mails').insert({
        guild_id: selectedGuildId,
        user_id: userId,
        title: 'Bakiye Yetersiz',
        body: `Satın alma işlemi yapılamadı — bakiye yetersiz. Gerekli: ${finalPrice.toFixed(2)} Papel. Mevcut bakiye: ${Number.isFinite(currentBalance) ? currentBalance.toFixed(2) : '0'} Papel.`,
        category: 'system',
        status: 'published',
        author_name: 'Foxord'
      });
    } catch (e) {
      console.warn('Failed to insert insufficient funds mail', e);
    }

    return NextResponse.json({ error: 'insufficient_funds', message: 'Bakiye yetersiz. Cüzdanınıza Papel ekleyin veya indirim kodunuzu kontrol edin.' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('store_orders')
    .insert({
      server_id: server.id,
      user_id: userId,
      item_id: item.id,
      item_title: item.title,
      role_id: item.role_id,
      duration_days: item.duration_days,
      expires_at: null,
      amount: finalPrice,
      status: 'pending',
      discount_code: appliedDiscount?.code,
      discount_percent: appliedDiscount?.percent,
    })
    .select('id,amount,status,created_at,expires_at')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }

  // --- PRE-CHECK: attempt to assign role via Discord REST before deducting funds ---
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      // mark order failed
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'missing_bot_token' }).eq('id', order?.id);
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    // validate role exists in guild
    const rolesRes = await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/roles`, { headers: { Authorization: `Bot ${botToken}` } }, { retries: 3 });
    if (!rolesRes.ok) {
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'roles_fetch_failed' }).eq('id', order?.id);
      return NextResponse.json({ error: 'roles_fetch_failed' }, { status: 500 });
    }
    const rolesList = await rolesRes.json();
    const targetRole = (rolesList || []).find((r: any) => String(r.id) === String(item.role_id));
    if (!targetRole) {
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'invalid_role_id' }).eq('id', order?.id);
      return NextResponse.json({ error: 'invalid_role_id', message: 'Ürün rolü sunucuda bulunamadı.' }, { status: 400 });
    }

    // Check bot identity and permissions/hierarchy before attempting assignment
    const meRes = await discordFetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
    const me = meRes.ok ? await meRes.json().catch(() => null) : null;
    const botId = me?.id;

    // fetch bot member to determine its roles in the guild
    let botMember = null;
    if (botId) {
      const botMemberRes = await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${botId}`, { headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
      if (botMemberRes.ok) botMember = await botMemberRes.json().catch(() => null);
    }

    // Determine role positions and bot permissions
    const targetPos = Number(targetRole.position ?? 0);
    let botMaxPos = -1;
    let botPerms = BigInt(0);
    if (botMember && Array.isArray(botMember.roles)) {
      for (const rId of botMember.roles) {
        const r = (rolesList || []).find((x: any) => String(x.id) === String(rId));
        if (r) {
          botMaxPos = Math.max(botMaxPos, Number(r.position ?? 0));
          try {
            botPerms = botPerms | BigInt(r.permissions || 0);
          } catch (e) {}
        }
      }
    }

    // MANAGE_ROLES permission (0x10000000)
    const MANAGE_ROLES = BigInt(0x10000000);
    if (botPerms && (botPerms & MANAGE_ROLES) !== MANAGE_ROLES) {
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'bot_missing_manage_roles' }).eq('id', order?.id);
      return NextResponse.json({ error: 'bot_missing_manage_roles', message: 'Botun rol yönetimi yetkisi yok.' }, { status: 403 });
    }

    if (botMaxPos >= 0 && botMaxPos <= targetPos) {
      // bot role hierarchy insufficient
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'bot_role_hierarchy' }).eq('id', order?.id);
      return NextResponse.json({ error: 'bot_role_hierarchy', message: 'Botun rol hiyerarşisi yetmiyor.' }, { status: 403 });
    }

    // Try to add role to user (this assigns the role). If this fails, we will not deduct funds.
    const assignRes = await discordFetch(
      `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${item.role_id}`,
      { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } },
      { retries: 2 },
    );

    if (!assignRes.ok) {
      // Hata detayını log'a yaz ama DB'ye kaydetme (güvenlik: Discord hata metni hassas bilgi içerebilir)
      const respText = await assignRes.text().catch(() => '');
      console.error('Role assign failed:', { status: assignRes.status, body: respText });
      await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'role_assign_failed', failure_code: assignRes.status }).eq('id', order?.id);

      // Insert HTML system mail to inform user
      try {
        const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
        const normalizedSite = siteUrl ? siteUrl.replace(/\/$/, '') : '';
        const refundUrl = normalizedSite ? `${normalizedSite}/api/member/refund?orderId=${order?.id}` : null;
        const dateStr = new Date().toLocaleDateString('tr-TR');
        const { refundButtonHtml } = await import('@/lib/mailHelpers');
        const buttonHtml = refundButtonHtml('role_assign_failed', refundUrl);
        const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#0f1113;color:#e6eef8;font-family:Inter,system-ui,Arial;padding:20px"><div style="max-width:600px;margin:0 auto;background:#0b0c0d;padding:20px;border-radius:12px"><div style="display:flex;gap:12px;align-items:center"><div style="width:48px;height:48;border-radius:10px;background:linear-gradient(135deg,#5865F2,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff">FOX</div><div><div style="font-weight:800">🛠️ Sistem Raporu: İşlem Kesintisi Bildirimi</div><div style="color:#b9bbbe;font-size:13px">DiscoWeb</div></div></div><div style="margin-top:12px;background:#111214;padding:14px;border-radius:10px;line-height:1.6"><p>Merhaba, ben DiscoWeb Baş Geliştiricisi.</p><p>Satın alma teslimatı sırasında bir hata oluştu. Ödeme düşülmeden önce rol verme işlemi başarısız oldu.</p><div style="font-family:Courier New,monospace;background:rgba(255,255,255,0.02);padding:12px;border-radius:8px;margin-top:12px">Durum: <strong>FAILED_TO_DELIVER</strong><br>Hata Kodu: <strong>ROLE_ASSIGN_FAILED</strong><br>HTTP: ${assignRes.status}</div><p style="margin-top:12px">Aşağıdaki butonu kullanarak iade talebini başlatabilirsin.</p><div style="margin-top:10px">${buttonHtml}</div><p style="margin-top:12px;color:#9aa0a6">Yaşanan aksaklık için üzgünüz.</p></div></div></body></html>`;

        await supabase.from('system_mails').insert({
          guild_id: selectedGuildId,
          user_id: userId,
          title: '🛠️ Sistem Raporu: İşlem Kesintisi Bildirimi',
          body: html,
          category: 'system',
          status: 'published',
          author_name: 'DiscoWeb Baş Geliştiricisi',
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to insert delivery-failure mail after assign failure', e);
      }

      return NextResponse.json({ error: 'role_assign_failed', message: 'Rol teslimatı başarısız oldu. Para düşülmedi.' }, { status: 400 });
    }
  } catch (err) {
    console.error('Role pre-check error:', err);
    await supabase.from('store_orders').update({ status: 'failed', failure_reason: 'role_precheck_error' }).eq('id', order?.id);
    return NextResponse.json({ error: 'role_precheck_error' }, { status: 500 });
  }

  const newBalance = Number((currentBalance - finalPrice).toFixed(2));

  // Atomically update wallet only if sufficient balance (prevents race conditions and bypassing checks)
  const { data: updatedWallet, error: walletError } = await supabase
    .from('member_wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .filter('balance', 'gte', finalPrice)
    .select('balance')
    .single();

  if (walletError || !updatedWallet) {
    // Rollback order if wallet update fails (concurrent spend or insufficient funds)
    // Attempt to remove previously assigned role since we haven't taken the money
    try {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken && item.role_id) {
        await discordFetch(`https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${item.role_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bot ${botToken}` },
        }, { retries: 1 }).catch(() => null);
      }
    } catch (e) {
      console.warn('Failed to rollback role after wallet failure', e);
    }

    await supabase.from('store_orders').delete().eq('id', order?.id);
    try {
      await supabase.from('system_mails').insert({
        guild_id: selectedGuildId,
        user_id: userId,
        title: 'Satın Alma Başarısız',
        body: `Merhaba — satın alma işleminiz sırasında bir aksamayla karşılaşıldı ve ödeme tamamlanamadı. Rol teslimatı yapılmış olabilir; ancak ödeme düşülmedi. Lütfen cüzdan bakiyenizi kontrol edin veya iade protokolünü başlatın.`,
        category: 'system',
        status: 'published',
        author_name: 'Foxord'
      });
    } catch (e) {
      console.warn('Failed to insert rollback failure mail', e);
    }
    return NextResponse.json({ error: 'insufficient_funds', message: 'Satın alma tamamlanamadı — bakiye yetersiz veya başka bir işlem tarafından kullanıldı.' }, { status: 400 });
  }

  await (supabase.from('wallet_ledger') as unknown as {
    insert: (values: Record<string, unknown>) => Promise<unknown>;
  }).insert({
    guild_id: selectedGuildId,
    user_id: userId,
    amount: -finalPrice,
    type: 'purchase',
    balance_after: updatedWallet.balance,
    metadata: { orderId: order?.id, itemId: item.id, discountCode: appliedDiscount?.code },
  });

  // Calculate expires_at for timed roles
  const nowIso = new Date().toISOString();
  let expiresAt: string | null = null;
  if (item.duration_days !== 0 && item.role_id) {
    // Kalıcı sipariş varsa süresiz bırak
    const { data: permanentOrder } = await supabase
      .from('store_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', item.role_id)
      .eq('status', 'paid')
      .is('revoked_at', null)
      .is('expires_at', null)
      .neq('id', order!.id)
      .limit(1);

    if (permanentOrder?.length) {
      expiresAt = null;
    } else {
      // Aktif siparişlerin en geç bitiş tarihine ekle
      const { data: activeOrders } = await supabase
        .from('store_orders')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('role_id', item.role_id)
        .eq('status', 'paid')
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .neq('id', order!.id)
        .order('expires_at', { ascending: false })
        .limit(1);

      const baseIso = activeOrders?.length ? activeOrders[0].expires_at : nowIso;
      // duration_days dakika cinsinden saklanıyor
      expiresAt = new Date(Date.parse(baseIso) + item.duration_days * 60000).toISOString();
    }
  }

  // Update order with items/subtotal/discount and mark as paid
  try {
    await supabase.from('store_orders').update({
      status: 'paid',
      applied_at: nowIso,
      expires_at: expiresAt,
      items: [
        {
          item_id: item.id,
          title: item.title,
          price: item.price,
          qty: 1,
          total: item.price,
        },
      ],
      subtotal: item.price,
      discount_amount: discountAmount ?? 0,
    }).eq('id', order?.id);
  } catch (e) {
    console.error('Failed to update order with items/subtotal:', e);
  }

  // Record discount usage if applied
  if (appliedDiscount) {
    await supabase.from('discount_usages').insert({
      discount_id: appliedDiscount.id,
      user_id: userId,
      order_id: order?.id,
    });

    // Increment discount used count
    await supabase
      .from('store_discounts')
      .update({ used_count: appliedDiscount.used_count + 1 })
      .eq('id', appliedDiscount.id);
  }

  // Send a professional receipt notification to the user's notification inbox
  let mailInserted = false;
  let mailInsertError: string | null = null;
  try {
    const getDiscordUser = async (uid: string) => {
      try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return null;
        const res = await discordFetch(`https://discord.com/api/users/${uid}`, { headers: { Authorization: `Bot ${botToken}` } }, { retries: 2 });
        if (!res.ok) return null;
        const u = await res.json();
        return { username: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null };
      } catch (e) {
        return null;
      }
    };

    const userInfo = await getDiscordUser(userId);
    const purchaseDate = new Date(order?.created_at ?? Date.now()).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' } as Intl.DateTimeFormatOptions);

    const bodyLines = [];
    bodyLines.push(`Sayın @${userInfo?.username ?? userId},`);
    bodyLines.push('');
    bodyLines.push(`${purchaseDate} tarihinde gerçekleştirdiğiniz satın alma işlemi başarıyla tamamlandı.`);
    bodyLines.push('');
    bodyLines.push(`Sipariş No: ${order?.id}`);
    bodyLines.push('');
    bodyLines.push('Ürünler:');
    bodyLines.push(`• ${item.title} x1 — ${Number(item.price).toFixed(2)} Papel`);
    bodyLines.push('');
    bodyLines.push(`Ara Toplam: ${Number(item.price).toFixed(2)} Papel`);
    bodyLines.push(`İndirim: ${Number(discountAmount ?? 0).toFixed(2)} Papel`);
    bodyLines.push(`Toplam Ödenen: ${Number(finalPrice).toFixed(2)} Papel`);
    bodyLines.push('');
    // Ödeme yöntemi ve hesap bakiyesi artık bildirime eklenmiyor
    bodyLines.push('Teşekkür ederiz — iyi günlerde kullanın.');

    const receiptBody = bodyLines.join('\n');

    const { error: mailError } = await supabase.from('system_mails').insert({
      guild_id: selectedGuildId,
      user_id: userId,
      title: `Sipariş Onayı`,
      body: receiptBody,
      category: 'reward',
      status: 'published',
      created_at: new Date().toISOString(),
      author_name: userInfo?.username ?? null,
      author_avatar_url: userInfo?.avatar ?? null,
    });
    if (mailError) {
      mailInsertError = String(mailError.message ?? JSON.stringify(mailError));
      console.error('Failed to insert receipt mail:', mailError);
    } else {
      mailInserted = true;
      console.log(`Receipt mail saved for ${userId} (order ${order?.id})`);
    }
  } catch (e) {
    console.error('Receipt notification failed:', e);
  }

  await logWebEvent(request, {
    event: 'store_purchase',
    status: 'success',
    userId,
    guildId: selectedGuildId,
    roleId: item.role_id ?? undefined,
    metadata: {
      orderId: order?.id,
      itemId: item.id,
      title: item.title,
      price: finalPrice,
      originalPrice: item.price,
      discountCode: appliedDiscount?.code,
      discountPercent: appliedDiscount?.percent,
      durationDays: item.duration_days,
      balanceAfter: newBalance,
    },
  });

  return NextResponse.json({ status: 'ok', order, balance: newBalance, mailInserted, mailInsertError });
}
