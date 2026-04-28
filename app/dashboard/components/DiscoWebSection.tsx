import { LuNewspaper } from 'react-icons/lu';
import { useT } from '@/contexts/LocaleContext';

type DiscoWebSectionProps = {
  onOpenAnnouncements: () => void;
};

export default function DiscoWebSection({ onOpenAnnouncements }: DiscoWebSectionProps) {
  const t = useT();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-[#0b0d12]/80 p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#5865F2] to-[#8b5cf6] p-4 text-white shadow-lg shadow-[#5865F2]/20">
              <span className="text-lg font-black">DW</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{t('discoweb_title')}</h1>
              <p className="max-w-2xl text-sm text-white/60">{t('discoweb_subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAnnouncements}
            className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
          >
            <LuNewspaper className="h-5 w-5 text-emerald-300" />
            {t('discoweb_announcement_menu_button')}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">{t('discoweb_section_highlight_title')}</h2>
          <p className="mt-3 text-sm text-white/60">{t('discoweb_section_highlight_text')}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">{t('discoweb_section_announcements_title')}</h2>
          <p className="mt-3 text-sm text-white/60">{t('discoweb_section_announcements_text')}</p>
        </div>
      </section>
    </div>
  );
}
