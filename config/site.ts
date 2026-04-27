export const siteConfig = {
  name: "DiscoWeb",
  hero: {
    badge: "Beta",
    title: "DiscoWeb",
    description: "Ekonomi sistemimiz ile sunucunuza daha fazla üye çekin.",
    cta: "Panele Git",
  },
  bot: {
    inviteUrl: process.env.NEXT_PUBLIC_DISCORD_BOT_INVITE || "https://discord.com/api/oauth2/authorize?client_id=1465696408656023698&permissions=8&scope=bot",
    name: "DiscoWeb Bot",
    description: "Gelişmiş Ekonomi Sistemi, Rol Yönetimi ve Daha Fazlası ile Sunucunuzu Yönetin.",
  },
  links: {
    docs: "https://discowebtr.vercel.app/docs",
    support: "https://discord.gg/vxK95JTFPw",
    github: "https://github.com/arjenxyz"
  }
};

// Translation keys for internationalization
export const siteConfigKeys = {
  name: "site_name",
  hero: {
    badge: "site_hero_badge",
    title: "site_hero_title",
    description: "site_hero_description",
    cta: "site_hero_cta",
  },
  bot: {
    name: "site_bot_name",
    description: "site_bot_description",
  }
};
