import {
  LuGift,
  LuInbox,
  LuMail,
  LuMegaphone,
  LuReceipt,
  LuSparkles,
  LuStar,
  LuTag,
  LuWrench,
} from 'react-icons/lu';

export const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;?/g, ' ');

export const previewText = (s?: string, max = 100) => {
  const t = stripHtml(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export const CATEGORY_CONFIG: Record<string, { labelKey: string; icon: React.ReactNode; css: string }> = {
  announcement: {
    labelKey: 'mail_category_announcement',
    icon: <LuMegaphone />,
    css: 'border-[#5865F2]/30 bg-[#5865F2]/10 text-[#5865F2]',
  },
  system: {
    labelKey: 'mail_category_system',
    icon: <LuMail />,
    css: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
  maintenance: {
    labelKey: 'mail_category_maintenance',
    icon: <LuWrench />,
    css: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  sponsor: {
    labelKey: 'mail_category_sponsor',
    icon: <LuStar />,
    css: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  },
  update: {
    labelKey: 'mail_category_update',
    icon: <LuSparkles />,
    css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
  lottery: {
    labelKey: 'mail_category_lottery',
    icon: <LuGift />,
    css: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  },
  reward: {
    labelKey: 'mail_category_reward',
    icon: <LuReceipt />,
    css: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
  },
  order: {
    labelKey: 'mail_category_order',
    icon: <LuTag />,
    css: 'border-white/20 bg-white/5 text-white/60',
  },
};

export const FIXED_CATEGORIES = ['announcement', 'system', 'update', 'reward', 'order'] as const;

export type MailNavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export const buildMailNavItems = (t: (key: string) => string): MailNavItem[] => [
  { key: 'all', label: t('mail_category_all'), icon: <LuInbox /> },
  ...FIXED_CATEGORIES.map((cat) => ({
    key: cat,
    label: t(CATEGORY_CONFIG[cat].labelKey),
    icon: CATEGORY_CONFIG[cat].icon ?? <LuMail />,
  })),
];

export const SENDER_NAME_KEYS: Record<string, string> = {
  announcement: 'mail_sender_announcement',
  system: 'mail_sender_system',
  maintenance: 'mail_sender_maintenance',
  sponsor: 'mail_sender_sponsor',
  update: 'mail_sender_update',
  lottery: 'mail_sender_lottery',
  reward: 'mail_sender_reward',
  order: 'mail_sender_order',
};
