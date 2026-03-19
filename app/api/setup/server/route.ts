import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSessionUserId, requireSessionUser } from '@/lib/auth';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const getSelectedGuildId = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('selected_guild_id')?.value ?? null;
};

// Slugify function to create URL-friendly slugs
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// Type used for summary items retrieved from DB
type SavedChannel = { channel_type: string; channel_name: string; webhook_url?: string | null };

export async function GET(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'VeritabanÄ± baÄŸlantÄ±sÄ± yapÄ±landÄ±rÄ±lmamÄ±ÅŸ' }, { status: 500 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const guildId = await getSelectedGuildId();

  if (!guildId) {
    return NextResponse.json({ error: 'Sunucu kimliÄŸi bulunamadÄ±' }, { status: 400 });
  }

  const { data: server, error } = await supabase
    .from('servers')
    .select('discord_id, admin_role_id, verify_role_id, is_setup, earn_per_message, earn_per_voice_minute, message_earn_enabled, voice_earn_enabled, tag_bonus_message, tag_bonus_voice, booster_bonus_message, booster_bonus_voice')
    .eq('discord_id', guildId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Sunucu bilgileri alÄ±namadÄ±' }, { status: 500 });
  }

  if (!server) {
    return NextResponse.json({ exists: false, is_setup: false });
  }

  return NextResponse.json({
    exists: true,
    is_setup: !!server.is_setup,
    admin_role_id: server.admin_role_id || null,
    verify_role_id: server.verify_role_id || null,
    earn_per_message: server.earn_per_message ?? 0,
    earn_per_voice_minute: server.earn_per_voice_minute ?? 0,
    message_earn_enabled: server.message_earn_enabled ?? false,
    voice_earn_enabled: server.voice_earn_enabled ?? false,
    tag_bonus_message: server.tag_bonus_message ?? 0,
    tag_bonus_voice: server.tag_bonus_voice ?? 0,
    booster_bonus_message: server.booster_bonus_message ?? 0,
    booster_bonus_voice: server.booster_bonus_voice ?? 0,
  });
}

export async function POST(request: Request) {
  try {
    const { guildId, adminRoleId, verifyRoleId, messageEarnEnabled, voiceEarnEnabled, earnPerMessage, earnPerVoiceMinute, tagBonusMessage, tagBonusVoice, boosterBonusMessage, boosterBonusVoice, approvalThreshold } = await request.json();

    if (!guildId || !adminRoleId || !verifyRoleId) {
      return NextResponse.json(
        { error: 'guildId, adminRoleId ve verifyRoleId gerekli' },
        { status: 400 }
      );
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: 'Bot token yapÄ±landÄ±rÄ±lmamÄ±ÅŸ' },
        { status: 500 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'VeritabanÄ± baÄŸlantÄ±sÄ± yapÄ±landÄ±rÄ±lmamÄ±ÅŸ' },
        { status: 500 }
      );
    }

    // KullanÄ±cÄ±nÄ±n admin olup olmadÄ±ÄŸÄ±nÄ± kontrol et
    const session = await requireSessionUser(request);
    if (!session.ok) {
      return session.response;
    }
    const userId = session.userId;

    // KullanÄ±cÄ±nÄ±n sunucuda admin olup olmadÄ±ÄŸÄ±nÄ± kontrol et
    const memberResponse = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!memberResponse.ok) {
      return NextResponse.json(
        { error: 'KullanÄ±cÄ± sunucuda bulunamadÄ±' },
        { status: 403 }
      );
    }

    const member = await memberResponse.json();

    // Sunucu bilgilerini al
    const guildResponse = await fetch(
      `https://discord.com/api/guilds/${guildId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!guildResponse.ok) {
      return NextResponse.json(
        { error: 'Sunucu bilgileri alÄ±namadÄ±' },
        { status: 500 }
      );
    }

    const guild = await guildResponse.json();

    // Kurulum Ã¶ncesi: Sadece sunucu sahibi kurulum yapabilir
    // Kurulum sonrasÄ±: Admin rolÃ¼ ile kontrol yapÄ±lÄ±r
    const isOwner = guild.owner_id === userId;

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Bu iÅŸlem iÃ§in sunucu sahibi olmanÄ±z gerekir' },
        { status: 403 }
      );
    }

    // Debug logging for incoming role selections
    console.log('Setup payload:', { guildId, adminRoleId, verifyRoleId, userId });

    // Fetch guild roles to validate provided role IDs
    const rolesResponse = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    let guildRoles: Array<{ id: string; permissions?: string }> = [];
    if (rolesResponse.ok) {
      guildRoles = await rolesResponse.json();
    } else {
      console.warn('Warning: could not fetch guild roles for validation', rolesResponse.status);
    }

    // VeritabanÄ±nda sunucuyu gÃ¼ncelle/kaydet
    const { data: existingServer } = await supabase
      .from('servers')
      .select('id, discord_id')
      .eq('discord_id', guildId)
      .single();

    let serverId: string;

    // Validate provided role IDs
    const findRole = (id: string | null) => guildRoles.find(r => r.id === id) || null;
    const adminRoleObj = findRole(adminRoleId);
    const verifyRoleObj = findRole(verifyRoleId);

    // Admin role must exist and have admin/manage guild/manage roles perms
    if (!adminRoleObj) {
      return NextResponse.json({ error: 'Belirtilen admin rolÃ¼ sunucuda bulunamadÄ±' }, { status: 400 });
    }
    const perms = BigInt(adminRoleObj.permissions ?? '0');
    const hasAdminPerm = (perms & BigInt(0x8)) !== BigInt(0) || (perms & BigInt(0x20)) !== BigInt(0) || (perms & BigInt(0x10000000)) !== BigInt(0);
    if (!hasAdminPerm) {
      return NextResponse.json({ error: 'SeÃ§ilen admin rolÃ¼ gerekli yÃ¶netim izinlerine sahip deÄŸil' }, { status: 400 });
    }

    if (!verifyRoleObj) {
      return NextResponse.json({ error: 'Belirtilen verify rolÃ¼ sunucuda bulunamadÄ±' }, { status: 400 });
    }

    if (existingServer) {
      // Mevcut sunucuyu gÃ¼ncelle
      const { data: updatedServer, error: updateError } = await supabase
        .from('servers')
        .update({
          name: guild.name,
          admin_role_id: adminRoleId,
          verify_role_id: verifyRoleId,
          is_setup: true,
          tag_id: guildId,
          message_earn_enabled: Boolean(messageEarnEnabled),
          earn_per_message: Number(earnPerMessage ?? 0),
          voice_earn_enabled: Boolean(voiceEarnEnabled),
          earn_per_voice_minute: Number(earnPerVoiceMinute ?? 0),
          tag_bonus_message: Number(tagBonusMessage ?? 0),
          tag_bonus_voice: Number(tagBonusVoice ?? 0),
          booster_bonus_message: Number(boosterBonusMessage ?? 0),
          booster_bonus_voice: Number(boosterBonusVoice ?? 0),
          approval_threshold: Math.min(100, Math.max(50, Number(approvalThreshold ?? 80))),
        })
        .eq('discord_id', guildId)
        .select('id, discord_id, admin_role_id, verify_role_id')
        .single();

      if (updateError) {
        console.error('Server update error:', updateError);
        return NextResponse.json(
          { error: 'Sunucu gÃ¼ncellenirken hata oluÅŸtu' },
          { status: 500 }
        );
      }
      serverId = updatedServer.id;
      console.log('Server updated:', updatedServer);
    } else {
      // Yeni sunucu oluÅŸtur
      const uniqueSlug = `${slugify(guild.name)}-${guildId}`;
      const { data: newServer, error: insertError } = await supabase
        .from('servers')
        .insert({
          discord_id: guildId,
          name: guild.name,
          slug: uniqueSlug,
          admin_role_id: adminRoleId,
          verify_role_id: verifyRoleId,
          is_setup: true,
          tag_id: guildId,
          message_earn_enabled: Boolean(messageEarnEnabled),
          earn_per_message: Number(earnPerMessage ?? 0),
          voice_earn_enabled: Boolean(voiceEarnEnabled),
          earn_per_voice_minute: Number(earnPerVoiceMinute ?? 0),
          tag_bonus_message: Number(tagBonusMessage ?? 0),
          tag_bonus_voice: Number(tagBonusVoice ?? 0),
          booster_bonus_message: Number(boosterBonusMessage ?? 0),
          booster_bonus_voice: Number(boosterBonusVoice ?? 0),
          approval_threshold: Math.min(100, Math.max(50, Number(approvalThreshold ?? 80))),
        })
        .select('id, discord_id, admin_role_id, verify_role_id')
        .single();

      if (insertError) {
        console.error('Server insert error:', insertError);
        return NextResponse.json(
          { error: 'Sunucu oluÅŸturulurken hata oluÅŸtu', detail: insertError.message, code: insertError.code },
          { status: 500 }
        );
      }
      serverId = newServer.id;
      console.log('Server created:', newServer);
    }

    // Double-check roles stored in DB for debugging
    console.log('Storing roles (payload):', { adminRoleId, verifyRoleId });

    // Fetch and log the saved server row to ensure values are persisted
    try {
      const { data: saved, error: savedErr } = await supabase
        .from('servers')
        .select('id, discord_id, admin_role_id, verify_role_id')
        .eq('discord_id', guildId)
        .single();
      if (savedErr) {
        console.warn('Could not fetch saved server row:', savedErr);
      } else {
        console.log('Saved server row:', saved);
      }
    } catch (fetchErr) {
      console.warn('Exception fetching saved server row:', fetchErr);
    }

    // Log kanallarÄ± iÃ§in kategoriler oluÅŸtur
    const createCategory = async (name: string) => {
      const resp = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type: 4,
          permission_overwrites: [
            {
              id: guildId,
              type: 0,
              deny: '1024',
            },
            {
              id: adminRoleId,
              type: 0,
              allow: '1024',
            },
          ],
        }),
      });

      if (!resp.ok) {
        return null;
      }

      const category = await resp.json();
      return category.id as string;
    };

    const userCategoryId = await createCategory('ğŸ’ Web Logs â€¢ Ãœyeler');
    const adminCategoryId = await createCategory('ğŸ’ Web Logs â€¢ Admin');
    const createdChannels: Array<{ type: string; name: string; id?: string; webhookUrl?: string | null }> = [];

    if (userCategoryId && adminCategoryId) {
      // Log kanallarÄ±nÄ± oluÅŸtur
      const logChannels = [
        { name: 'user-main-log', type: 'user_main', parentId: userCategoryId },
        { name: 'user-auth-log', type: 'user_auth', parentId: userCategoryId },
        { name: 'user-roles-log', type: 'user_roles', parentId: userCategoryId },
        { name: 'user-exchange-log', type: 'user_exchange', parentId: userCategoryId },
        { name: 'user-store-log', type: 'user_store', parentId: userCategoryId },
        { name: 'admin-main-log', type: 'admin_main', parentId: adminCategoryId },
        { name: 'admin-wallet-log', type: 'admin_wallet', parentId: adminCategoryId },
        { name: 'admin-store-log', type: 'admin_store', parentId: adminCategoryId },
        { name: 'admin-notifications-log', type: 'admin_notifications', parentId: adminCategoryId },
        { name: 'admin-settings-log', type: 'admin_settings', parentId: adminCategoryId },
      ];

      for (const logChannel of logChannels) {
        // Create the channel with a professional topic
        const channelResponse = await fetch(
          `https://discord.com/api/guilds/${guildId}/channels`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: logChannel.name,
              type: 0, // Text channel
              parent_id: logChannel.parentId,
              topic: `Automated log channel (${logChannel.type}) â€” created by Web setup`,
              permission_overwrites: [
                {
                  id: guildId, // @everyone
                  type: 0,
                  deny: '1024', // ViewChannel
                },
                {
                  id: adminRoleId,
                  type: 0,
                  allow: '1024', // ViewChannel
                },
              ],
            }),
          },
        );

        if (channelResponse.ok) {
          const channel = await channelResponse.json();

          // Webhook oluÅŸtur veya mevcut webhook'u bul
          let webhookUrl: string | null = null;
          try {
            // Try to create new webhook
            const webhookResponse = await fetch(
              `https://discord.com/api/channels/${channel.id}/webhooks`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bot ${botToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: `${logChannel.type}-webhook`,
                }),
              },
            );

            if (webhookResponse.ok) {
              const webhook = await webhookResponse.json();
              webhookUrl = `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
              console.log('âœ… Webhook oluÅŸturuldu:', logChannel.type, webhookUrl);
            } else {
              // If creation fails, try to list existing webhooks and pick first
              console.warn('âš ï¸ Webhook oluÅŸturulamadÄ±, deneyeceÄŸim mevcut webhooklarÄ± almak:', logChannel.type, webhookResponse.status);
              const listResp = await fetch(`https://discord.com/api/channels/${channel.id}/webhooks`, {
                headers: { Authorization: `Bot ${botToken}` },
              });
              if (listResp.ok) {
                const list = await listResp.json();
                if (Array.isArray(list) && list.length > 0) {
                  const wh = list[0];
                  webhookUrl = `https://discord.com/api/webhooks/${wh.id}/${wh.token}`;
                  console.log('â„¹ï¸ Mevcut webhook bulundu:', webhookUrl);
                }
              }
            }
          } catch (webhookError) {
            console.log(`âŒ Webhook iÅŸlemi sÄ±rasÄ±nda hata (create/list) ${logChannel.name}:`, webhookError);
          }

          createdChannels.push({
            type: logChannel.type,
            name: logChannel.name,
            id: channel.id,
            webhookUrl,
          });

          // VeritabanÄ±na kaydet (webhook_url nil olabilir)
          const { error: botLogUpsertError } = await supabase
            .from('bot_log_channels')
            .upsert({
              guild_id: guildId,
              channel_type: logChannel.type,
              channel_id: channel.id,
              category_id: logChannel.parentId,
              webhook_url: webhookUrl,
              is_active: webhookUrl ? true : false,
            });

          if (botLogUpsertError) {
            console.error('âŒ bot_log_channels upsert error:', botLogUpsertError);
          }

          // AyrÄ±ca konfigÃ¼rasyon tablosuna webhook'u kaydet (varsayÄ±lan aktiflik webhooka baÄŸlÄ±)
          const { error: logConfigUpsertError } = await supabase
            .from('log_channel_configs')
            .upsert({
              guild_id: guildId,
              channel_type: logChannel.type,
              webhook_url: webhookUrl,
              is_active: webhookUrl ? true : false,
            });

          if (logConfigUpsertError) {
            console.error('âŒ log_channel_configs upsert error:', logConfigUpsertError);
          }
        } else {
          createdChannels.push({
            type: logChannel.type,
            name: logChannel.name,
          });
        }
      }
    }

    // Log kanal konfigÃ¼rasyonlarÄ±nÄ± da (varsayÄ±lan aktif) kaydet - varsa gÃ¼ncelle
    const defaultChannels = [
      'user_main',
      'user_auth',
      'user_roles',
      'user_exchange',
      'user_store',
      'admin_main',
      'admin_wallet',
      'admin_store',
      'admin_notifications',
      'admin_settings',
    ];

    await supabase
      .from('log_channel_configs')
      .upsert(
        defaultChannels.map((ct) => ({
          guild_id: guildId,
          channel_type: ct,
          is_active: false,
        })),
        { onConflict: 'guild_id,channel_type', ignoreDuplicates: true },
      );

    // Send webhook test messages for all configured channels
    try {
      let botAvatarUrl: string | null = null;
      try {
        const meResp = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (meResp.ok) {
          const bot = await meResp.json();
          if (bot?.id && bot?.avatar) {
            botAvatarUrl = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png`;
          }
        }
      } catch {
        // ignore avatar lookup errors
      }

      const { data: testTargets } = await supabase
        .from('log_channel_configs')
        .select('channel_type,webhook_url,is_active')
        .eq('guild_id', guildId)
        .eq('is_active', true);

      const { data: botChannels } = await supabase
        .from('bot_log_channels')
        .select('channel_type,channel_id')
        .eq('guild_id', guildId);

      const channelIdMap = new Map<string, string>();
      (botChannels || []).forEach((row) => {
        if (row.channel_type && row.channel_id) {
          channelIdMap.set(row.channel_type, row.channel_id);
        }
      });

      if (Array.isArray(testTargets) && testTargets.length > 0) {
        await Promise.allSettled(
          testTargets
            .filter((row) => row.webhook_url)
            .map((row) => {
              const channelId = channelIdMap.get(row.channel_type);
              const channelText = channelId ? `<#${channelId}>` : row.channel_type;
              return fetch(row.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: 'Veri Merkezi',
                  avatar_url: botAvatarUrl ?? undefined,
                  embeds: [
                    {
                      title: 'Webhook BaÄŸlantÄ± OnayÄ±',
                      description:
                        `Bu mesaj, webhook servisinin hedef URL ile baÅŸarÄ±lÄ± bir ÅŸekilde eÅŸleÅŸtiÄŸini doÄŸrulamak amacÄ±yla sistem tarafÄ±ndan otomatik olarak oluÅŸturulmuÅŸtur.\n\n` +
                        `Ä°ÅŸlem: Otomatik Kurulum Testi\n` +
                        `Kanal: ${channelText}\n\n` +
                        `Ã–nemli Not: EÄŸer bu mesajÄ±n iletildiÄŸi kanal bilgileri veya yapÄ±landÄ±rma ayarlarÄ± sisteminizle uyuÅŸmuyorsa, lÃ¼tfen vakit kaybetmeden destek sunucumuza gelerek teknik ekibimizle iletiÅŸime geÃ§iniz.`,
                      color: 3982620,
                      author: botAvatarUrl ? { name: 'Veri Merkezi', icon_url: botAvatarUrl } : { name: 'Veri Merkezi' },
                    },
                  ],
                }),
              });
            })
        );
      }
    } catch (testError) {
      console.warn('Webhook test messages failed:', testError);
    }

    // Prepare and send a professional summary to the main-log webhook if present
    try {
      const { data: savedChannels } = await supabase
        .from('bot_log_channels')
        .select('channel_type,channel_name,webhook_url')
        .eq('guild_id', guildId);

      const summaryItems = ((savedChannels || []) as SavedChannel[]).map((c) => ({ type: c.channel_type, name: c.channel_name, webhook: c.webhook_url || null }));

      const mainEntry = summaryItems.find(s => s.type === 'admin_main') || summaryItems.find(s => s.type === 'user_main');
      if (mainEntry && mainEntry.webhook) {
        const payload = {
          embeds: [
            {
              title: 'âœ… Sunucu Kurulumu TamamlandÄ±',
              description: `Sunucu **${guild.name}** iÃ§in log kanallarÄ± baÅŸarÄ±yla oluÅŸturuldu ve webhook'lar atandÄ±.`,
              color: 5793266,
              fields: [
                { name: 'Toplam Kanal', value: `${summaryItems.length}`, inline: true },
                { name: 'Kanallar', value: summaryItems.map(s => `â€¢ ${s.name} (${s.type}) â€” ${s.webhook ? 'Webhook âœ…' : 'Webhook âŒ'}`).join('\n'), inline: false },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        };

        await fetch(mainEntry.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (summaryErr) {
      console.warn('âš ï¸ Ã–zet webhook gÃ¶nderimi sÄ±rasÄ±nda hata:', summaryErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Sunucu baÅŸarÄ±yla kuruldu',
      serverId,
      userCategoryId,
      adminCategoryId,
      createdChannels,
    });

  } catch (error) {
    console.error('Setup API error:', error);
    return NextResponse.json(
      { error: 'Kurulum sÄ±rasÄ±nda beklenmeyen hata oluÅŸtu' },
      { status: 500 }
    );
  }
}

