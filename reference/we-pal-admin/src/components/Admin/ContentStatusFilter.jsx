import { useLanguage } from '../../i18n/LanguageContext';
import { CONTENT_STATUSES } from '../../utils/contentStatus';

// «الكل / مسودة / منشور» لقوائم محتوى الإدارة.
export default function ContentStatusFilter({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="inline-flex gap-1 rounded-xl bg-[#F0F0F0] p-1" role="group" aria-label={t('adminApi.statusFilter')}>
      {CONTENT_STATUSES.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${value === key ? 'bg-white text-[var(--wp-ink)] shadow-sm' : 'text-[var(--wp-text-3)]'}`}
        >
          {t(`adminApi.status.${key}`)}
        </button>
      ))}
    </div>
  );
}

export function DraftBadge() {
  const { t } = useLanguage();
  return (
    <span className="ms-2 rounded-full bg-[var(--wp-warning-tint)] px-2 py-0.5 text-[11px] font-bold text-[#8A5A0B]">
      {t('adminApi.status.draft')}
    </span>
  );
}
