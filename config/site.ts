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
    support: "https://discord.gg/fDPsYhvKmu",
    github: "https://github.com/arjenxyz"
  }
};
