import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { checkMaintenance } from '@/lib/maintenance';
import { discordFetch } from '@/lib/discordRest';
import { getSessionUserId, requireSessionUser } from '@/lib/auth';
import { logWebEvent } from '@/lib/serverLogger';
import { cleanupExpiredRolesForUser } from '@/lib/roleCleanup';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? null;

const getSupabase = (): SupabaseClient | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};


const getSelectedGuildId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const selectedGuildId = cookieStore.get('selected_guild_id')?.value;
  return selectedGuildId || GUILD_ID;
};

export async function GET(request: Request) {
  // Development mode bypass for Activity
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({
      categories: [
        {
          id: 'roles',
          name: 'Roller',
          description: 'Sunucu rollerini satın al',
          items: [
            {
              id: 'vip',
              name: 'VIP Rolü',
              description: 'Özel renk ve yetkiler',
              price: 500,
              icon: '/gif/cat.gif',
              type: 'role',
              available: true
            },
            {
              id: 'premium',
              name: 'Premium Rolü',
              description: 'Tüm premium özellikler',
              price: 1000,
              icon: '/gif/cat.gif',
              type: 'role',
              available: true
            }
          ]
        }
      ],
      featured: [],
      limited: []
    });
  }

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
  const supabaseClient = supabase as SupabaseClient;

  const selectedGuildId = await getSelectedGuildId();

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (serverError || !server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Clean up expired store roles for this user (if logged in) even if bot is offline.
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    await cleanupExpiredRolesForUser(supabaseClient, server.id, selectedGuildId ?? '', sessionUserId, process.env.DISCORD_BOT_TOKEN);
  }

  const now = new Date().toISOString();

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));
  const offset = (page - 1) * limit;

  const { data: promotions, error: promotionsError } = await supabase
    .from('promotions')
    .select('id,code,value,max_uses,used_count,status,expires_at,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (promotionsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from('store_items')
    .select('id,title,description,price,status,role_id,duration_days,created_at')
    .eq('server_id', server.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (itemsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  const hasMore = (items?.length ?? 0) >= limit;

  return NextResponse.json({ promotions: promotions ?? [], items: items ?? [], hasMore, page, limit });
}

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
  const supabaseClient = supabase as SupabaseClient;

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;
  const selectedGuildId = await getSelectedGuildId();

  console.log('Checkout request:', { userId, selectedGuildId });

  const { data: server } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', selectedGuildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Cleanup expired roles for this user (in case bot is offline)
  await cleanupExpiredRolesForUser(supabaseClient, server.id, selectedGuildId ?? '', userId, process.env.DISCORD_BOT_TOKEN);

  console.log('Server found:', server.id);

  // Parse cart items from request
  const body = await request.json().catch(() => ({}));
  const { items, appliedCoupon }: { items: Array<{ itemId: string; qty: number }>; appliedCoupon?: { id: string } } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'invalid_cart' }, { status: 400 });
  }

  // Get item details and calculate total
  const itemIds = items.map(i => i.itemId);
  const { data: storeItems } = await supabase
    .from('store_items')
    .select('id, title, price, role_id, duration_days')
    .in('id', itemIds);

  if (!storeItems || storeItems.length !== itemIds.length) {
    return NextResponse.json({ error: 'invalid_items' }, { status: 400 });
  }

  let subtotal = 0;
  const orderItems = items.map(cartItem => {
    const item = storeItems.find(si => si.id === cartItem.itemId);
    if (!item) throw new Error('item_not_found');
    const unitPrice = Number(item.price ?? 0);
    const qty = Math.max(1, Number(cartItem.qty ?? 1));
    if (isNaN(unitPrice) || unitPrice < 0) throw new Error('invalid_item_price');
    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;
    return {
      item_id: item.id,
      title: item.title,
      price: unitPrice,
      qty,
      total: itemTotal,
      role_id: item.role_id,
      duration_days: item.duration_days,
    };
  });

  // Calculate discount
  let discountAmount = 0;
  let discountId = null;
  if (appliedCoupon?.id) {
    const { data: coupon } = await supabase
      .from('store_discounts')
      .select('id, percent, min_spend, status')
      .eq('id', appliedCoupon.id)
      .eq('status', 'active')
      .maybeSingle();

    if (coupon) {
      // enforce min_spend if present
      const minSpend = Number(coupon.min_spend ?? 0);
      if (minSpend > 0 && subtotal < minSpend) {
        const remaining = Number((minSpend - subtotal).toFixed(2));
        return NextResponse.json({ error: 'MIN_SPEND_NOT_MET', remaining, minSpend }, { status: 400 });
      }

      discountAmount = Math.round((subtotal * coupon.percent) / 100 * 100) / 100;
      discountId = coupon.id;
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Check wallet balance (create if not exists)
  let { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('guild_id', selectedGuildId)
    .maybeSingle();

  if (!wallet) {
    // Create wallet if not exists
    const { data: newWallet, error: createError } = await supabase
      .from('member_wallets')
      .insert({
        user_id: userId,
        guild_id: selectedGuildId,
        balance: 0,
      })
      .select('balance')
      .single();

    if (createError) {
      console.error('Wallet creation failed:', createError);
      return NextResponse.json({ error: 'wallet_creation_failed', details: createError.message }, { status: 500 });
    }
    wallet = newWallet;
  }

  const currentBalance = Number(wallet.balance ?? 0);

  console.log('Checkout debug:', { userId, selectedGuildId, serverId: server.id, total, currentBalance });

  if (currentBalance < total) {
    return NextResponse.json({ error: 'insufficient_balance', required: total, available: currentBalance }, { status: 400 });
  }

  // Create order with pending status
  const { data: order, error: orderError } = await supabase
    .from('store_orders')
    .insert({
      user_id: userId,
      server_id: server.id,
      items: orderItems,
      subtotal,
      discount_amount: discountAmount,
      amount: total,
      // Use first item's role/duration to satisfy NOT NULL constraints
      role_id: orderItems[0]?.role_id,
      duration_days: orderItems[0]?.duration_days,
      status: 'pending',
    })
    .select('id, role_id, duration_days')
    .single();

  if (orderError || !order) {
    console.error('Order creation failed:', orderError);
    // Return error details temporarily to help debugging schema/constraint issues
    return NextResponse.json({ error: 'order_failed', details: orderError?.message ?? orderError ?? 'unknown' }, { status: 500 });
  }

  // --- ROLE ASSIGNMENT: directly attempt via Discord REST API (works even if bot is offline) ---
  const assignedRoles: Array<{ roleId: string }> = [];
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      await supabaseClient.from('store_orders').update({ status: 'failed', failure_reason: 'missing_bot_token' }).eq('id', order?.id);
      return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
    }

    for (const it of orderItems) {
      if (!it.role_id) continue;

      // Directly try to assign the role — Discord API handles permission validation
      const assignRes = await discordFetch(
        `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${it.role_id}`,
        { method: 'PUT', headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' } },
        { retries: 3 },
      );

      if (!assignRes.ok) {
        const respText = await assignRes.text().catch(() => '');
        console.error('Role assign failed:', { status: assignRes.status, body: respText, roleId: it.role_id });
        await supabaseClient.from('store_orders').update({ status: 'failed', failure_reason: 'role_assign_failed' }).eq('id', order?.id);

        // Send failure notification mail
        try {
          const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
          const normalizedSite = siteUrl ? siteUrl.replace(/\/$/, '') : '';
          const refundUrl = normalizedSite ? `${normalizedSite}/api/member/refund?orderId=${order?.id}` : null;
          const { refundButtonHtml } = await import('@/lib/mailHelpers');
          const buttonHtml = refundButtonHtml('role_assign_failed', refundUrl);
          const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#0f1113;color:#e6eef8;font-family:Inter,system-ui,Arial;padding:20px"><div style="max-width:600px;margin:0 auto;background:#0b0c0d;padding:20px;border-radius:12px"><div style="display:flex;gap:12px;align-items:center"><div style="width:48px;height:48;border-radius:10px;background:linear-gradient(135deg,#5865F2,#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff">FOX</div><div><div style="font-weight:800">Sistem Raporu: İşlem Kesintisi</div><div style="color:#b9bbbe;font-size:13px">DiscoWeb</div></div></div><div style="margin-top:12px;background:#111214;padding:14px;border-radius:10px;line-height:1.6"><p>Satın alma teslimatı sırasında bir hata oluştu. Ödeme düşülmeden önce rol verme işlemi başarısız oldu.</p><div style="font-family:Courier New,monospace;background:rgba(255,255,255,0.02);padding:12px;border-radius:8px;margin-top:12px">Durum: <strong>FAILED_TO_DELIVER</strong><br>HTTP: ${assignRes.status}</div><p style="margin-top:12px">Aşağıdaki butonu kullanarak iade talebini başlatabilirsin.</p><div style="margin-top:10px">${buttonHtml}</div><p style="margin-top:12px;color:#9aa0a6">Yaşanan aksaklık için üzgünüz.</p></div></div></body></html>`;
          await supabaseClient.from('system_mails').insert({ guild_id: selectedGuildId, user_id: userId, title: 'Sistem Raporu: İşlem Kesintisi', body: html, category: 'system', status: 'published', author_name: 'DiscoWeb Sistem', created_at: new Date().toISOString() });
        } catch (e) {
          console.warn('Failed to insert delivery-failure mail', e);
        }

        return NextResponse.json({ error: 'role_assign_failed', message: 'Rol teslimatı başarısız oldu. Para düşülmedi.' }, { status: 400 });
      }

      assignedRoles.push({ roleId: it.role_id });
    }
  } catch (err) {
    console.error('Role assignment error:', err);
    await supabaseClient.from('store_orders').update({ status: 'failed', failure_reason: 'role_assign_error' }).eq('id', order?.id);
    return NextResponse.json({ error: 'role_assign_error', message: 'Rol verme sırasında hata oluştu.' }, { status: 500 });
  }

  // Attempt to atomically deduct from wallet only if enough balance
  const { data: updatedWallet, error: walletUpdateError } = await supabase
    .from('member_wallets')
    .update({ balance: currentBalance - total, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('guild_id', selectedGuildId)
    .filter('balance', 'gte', total)
    .select('balance')
    .single();

  if (walletUpdateError || !updatedWallet) {
    console.error('Wallet deduction failed:', walletUpdateError);
    // Rollback: assigned rollerini geri almaya çalış
    const rollbackFailed: string[] = [];
    try {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        for (const r of assignedRoles) {
          const res = await fetch(
            `https://discord.com/api/guilds/${selectedGuildId}/members/${userId}/roles/${r.roleId}`,
            { method: 'DELETE', headers: { Authorization: `Bot ${botToken}` } }
          ).catch(() => null);
          if (!res || !res.ok) {
            rollbackFailed.push(r.roleId);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to rollback roles after wallet failure', e);
    }

    if (rollbackFailed.length > 0) {
      // Rollback başarısız — order'ı silme, kayıt tut
      console.error('Role rollback failed for roles:', rollbackFailed);
      await supabaseClient
        .from('store_orders')
        .update({ status: 'rollback_failed', failure_reason: `role_rollback_failed: ${rollbackFailed.join(',')}` })
        .eq('id', order?.id);
      // Kullanıcıya bilgi ver
      try {
        await supabaseClient.from('system_mails').insert({
          guild_id: selectedGuildId,
          user_id: userId,
          title: 'Sipariş Hatası: Yönetici İncelemesi Gerekiyor',
          body: `Sipariş #${order?.id} işleminizde ödeme alınamadı ancak rol geri alınamadı. Yönetici inceleyecektir.`,
          category: 'system',
          status: 'published',
          author_name: 'DiscoWeb Sistem',
          created_at: new Date().toISOString(),
        });
      } catch {}
      return NextResponse.json({ error: 'rollback_failed', message: 'Ödeme işlemi başarısız, yönetici bilgilendirildi.' }, { status: 500 });
    }

    await supabaseClient.from('store_orders').update({ status: 'failed', failure_reason: 'insufficient_balance_concurrent' }).eq('id', order?.id);
    return NextResponse.json({ error: 'insufficient_balance', required: total, available: currentBalance }, { status: 400 });
  }

  // Mark order as paid and calculate expires_at so the system can revoke role even if bot is offline
  const nowIso = new Date().toISOString();

  let expiresAt: string | null = null;
  if (order.duration_days !== 0 && order.role_id) {
    // If there is an existing permanent order, keep it permanent.
    const { data: permanentOrder } = await supabase
      .from('store_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('role_id', order.role_id)
      .eq('status', 'paid')
      .is('revoked_at', null)
      .is('expires_at', null)
      .neq('id', order.id)
      .limit(1);

    if (permanentOrder?.length) {
      expiresAt = null;
    } else {
      const { data: activeOrders } = await supabase
        .from('store_orders')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('role_id', order.role_id)
        .eq('status', 'paid')
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .neq('id', order.id)
        .order('expires_at', { ascending: false })
        .limit(1);

      const baseIso = activeOrders?.length ? activeOrders[0].expires_at : nowIso;
      expiresAt = new Date(Date.parse(baseIso) + order.duration_days * 60000).toISOString();
    }
  }

  await supabase
    .from('store_orders')
    .update({ status: 'paid', applied_at: nowIso, expires_at: expiresAt })
    .eq('id', order.id);

  // Fetch updated order for mail
  const { data: updatedOrder } = await supabase
    .from('store_orders')
    .select('id, applied_at, created_at')
    .eq('id', order.id)
    .single();

  if (!updatedOrder) {
    console.error('Failed to fetch updated order for mail');
    return NextResponse.json({ success: true });
  }

  // Add wallet ledger entry
  await supabaseClient.from('wallet_ledger').insert({
    user_id: userId,
    guild_id: selectedGuildId,
    amount: -total,
    type: 'purchase',
    balance_after: updatedWallet.balance,
    metadata: {
      order_id: order.id,
      description: `Store purchase - Order #${order.id}`,
    },
  });

  // Mark discount as used if applied
  if (discountId) {
    await supabaseClient.from('discount_usages').insert({
      discount_id: discountId,
      user_id: userId,
      order_id: order.id,
    });
    // used_count artır
    const { data: discData } = await supabaseClient
      .from('store_discounts')
      .select('used_count')
      .eq('id', discountId)
      .single();
    if (discData) {
      await supabaseClient
        .from('store_discounts')
        .update({ used_count: ((discData as any).used_count ?? 0) + 1 })
        .eq('id', discountId);
    }
  }

  // Send professional receipt to notifications
  let mailInserted = false;
  let mailInsertError: string | null = null;
  try {
    const getDiscordUser = async (uid: string) => {
      try {
        const botToken = process.env.DISCORD_BOT_TOKEN;
        if (!botToken) return null;
        const res = await fetch(`https://discord.com/api/users/${uid}`, { headers: { Authorization: `Bot ${botToken}` } });
        if (!res.ok) return null;
        const u = await res.json();
        return { username: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        return null;
      }
    };

    const userInfo = await getDiscordUser(userId);
    const purchaseDate = new Date(updatedOrder.applied_at ?? updatedOrder.created_at ?? Date.now()).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' } as Intl.DateTimeFormatOptions);

    const lines: string[] = [];
    lines.push(`Sayın @${userInfo?.username ?? userId},`);
    lines.push('');
    lines.push(`${purchaseDate} tarihinde gerçekleştirdiğiniz satın alma işlemi başarıyla tamamlandı.`);
    lines.push('');
    lines.push(`Sipariş No: ${updatedOrder.id}`);
    lines.push('');
    lines.push('Ürünler:');
    for (const it of orderItems) {
      lines.push(`• ${it.title} x${it.qty} — ${Number(it.price).toFixed(2)} each, toplam ${Number(it.total).toFixed(2)} Papel`);
    }
    lines.push('');
    lines.push(`Ara Toplam: ${Number(subtotal).toFixed(2)} Papel`);
    lines.push(`İndirim: ${Number(discountAmount ?? 0).toFixed(2)} Papel`);
    lines.push(`Toplam Ödenen: ${Number(total).toFixed(2)} Papel`);
    lines.push('');
    // Ödeme yöntemi ve hesap bakiyesi artık bildirime eklenmiyor
    lines.push('Fişiniz tarafınıza iletilmiştir. İyi günlerde kullanın.');

    const receiptBody = lines.join('\n');

    const metadata = {
      order_id: updatedOrder.id,
      items: orderItems.map(it => ({ title: it.title, qty: it.qty, price: it.price, total: it.total })),
      subtotal: Number(subtotal),
      discount: Number(discountAmount ?? 0),
      total: Number(total),
      purchase_date: updatedOrder.applied_at ?? updatedOrder.created_at,
    };

    const { error: mailErr } = await supabaseClient.from('system_mails').insert({
      guild_id: selectedGuildId,
      user_id: userId,
      title: `Sipariş Onayı`,
      body: receiptBody,
      metadata: metadata,
      category: 'order',
      status: 'published',
      created_at: new Date().toISOString(),
      author_name: userInfo?.username ?? null,
      author_avatar_url: userInfo?.avatar ?? null,
    });
    if (mailErr) {
      mailInsertError = String(mailErr.message ?? JSON.stringify(mailErr));
      console.error('Receipt mail error:', mailErr);
    } else {
      mailInserted = true;
      console.log(`Receipt mail saved for ${userId} (order ${updatedOrder.id})`);
    }
  } catch {
    console.error('Receipt notification failed');
  }

  // Discord log kanalına bildir
  await logWebEvent(request, {
    event: 'store_purchase',
    status: 'success',
    userId,
    guildId: selectedGuildId ?? undefined,
    metadata: {
      orderId: order.id,
      itemCount: orderItems.length,
      total: Number(total),
      discount: Number(discountAmount ?? 0),
      items: orderItems.map(it => ({ title: it.title, qty: it.qty, price: it.price })),
    },
  });

  return NextResponse.json({ success: true, orderId: order.id, newBalance: updatedWallet.balance, mailInserted, mailInsertError });
}
