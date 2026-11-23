import { useLanguage } from '../../i18n/LanguageContext';

// رسالة خطأ موحّدة مع زر «إعادة المحاولة» اختياري.
// error: نص أو كائن فيه message (مثل ApiError)؛ عند غيابه تظهر رسالة التحميل العامة.
export default function ErrorState({ error, onRetry, className = '' }) {
  const { t } = useLanguage();
  const message = (typeof error === 'string' ? error : error?.message) || t('common.loadError');
  return (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-xl border border-[#F0DAD6] bg-[var(--wp-coral-wash)] p-4 text-sm text-[var(--wp-coral-deep)] ${className}`}
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          // بلا وسيط: دوال التحميل التي تأخذ علم إلغاء (isActive) لا تستقبل حدث النقر بدلًا منه.
          onClick={() => onRetry()}
          className="shrink-0 rounded-lg bg-[var(--wp-ink)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--wp-coral)] hover:text-[var(--wp-ink)]"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
