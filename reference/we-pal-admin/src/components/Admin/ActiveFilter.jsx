import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

// شريحة مرشّح فعّال جاء من العنوان (بطاقة «نظرة عامة» أو تذكير في الرئيسية)، بزر يزيله (docs/ADMIN-UX.md §2).
export default function ActiveFilter({ label, onClear }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-primary-soft)] ps-3 pe-1 text-xs font-semibold text-[var(--color-primary-strong)]">
      {label}
      <button type="button" className="wp-icon-act" onClick={onClear} aria-label={t('adminLists.activeFilter.clear', { label })} title={t('adminLists.activeFilter.clear', { label })}>
        <X aria-hidden="true" />
      </button>
    </span>
  );
}
