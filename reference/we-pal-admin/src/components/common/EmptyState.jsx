import { Inbox } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

// حالة «لا يوجد شيء»: أيقونة + عنوان + نص اختياري + إجراء اختياري (زر أو رابط).
export default function EmptyState({ icon: Icon = Inbox, title, text, action, className = '' }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--wp-border,#E5E5E5)] px-6 py-10 text-center ${className}`}
    >
      <Icon size={28} aria-hidden="true" className="text-[var(--wp-text-muted)]" />
      <p className="text-sm font-bold text-[var(--wp-ink)]">{title || t('common.noResults')}</p>
      {text && <p className="max-w-sm text-xs leading-relaxed text-[var(--wp-text-3)]">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
