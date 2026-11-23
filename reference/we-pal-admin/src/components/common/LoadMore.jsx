import { useLanguage } from '../../i18n/LanguageContext';
import useLoadMoreAnnounce from '../ui/useLoadMoreAnnounce';

// زر «عرض المزيد» لقوائم useInfiniteList في التصميم الحالي؛ لا يظهر إن لم تبقَ صفحات.
// مع announce (و count و listRef): يُعلن ما أُضيف لقارئ الشاشة، وبعد آخر صفحة ينتقل التركيز إلى أول
// عنصر جديد بدل أن يضيع مع الزر (كـ ui/LoadMore). بلا announce يبقى كما كان.
export default function LoadMore({ hasMore, loading, onLoadMore, count = 0, listRef, announce, className = '' }) {
  const { t } = useLanguage();
  const { press, message } = useLoadMoreAnnounce({ hasMore, onLoadMore, count, listRef, announce });
  const button = hasMore && (
    <div className={`flex justify-center ${className}`}>
      <button
        type="button"
        onClick={press}
        disabled={loading}
        aria-busy={loading}
        className="rounded-xl border border-[var(--wp-border,#E5E5E5)] px-5 py-2 text-sm font-bold text-[var(--wp-text-2)] transition-colors hover:border-[var(--wp-ink)] disabled:opacity-50"
      >
        {loading ? t('common.loading') : t('common.showMore')}
      </button>
    </div>
  );
  if (!announce) return button || null;
  return (
    <>
      {button}
      <p className="sr-only" role="status">{message}</p>
    </>
  );
}
