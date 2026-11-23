import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Edit3, Trash2, Search, Plus } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import * as adminApi from '../../api/admin';
import useAdminContent from '../../hooks/useAdminContent';
import ContentStatusFilter, { DraftBadge } from '../../components/Admin/ContentStatusFilter';
import LoadMore from '../../components/common/LoadMore';
import { CONTENT_STATUSES, isDraft, localizedField } from '../../utils/contentStatus';
import { formatShortDate } from '../../utils/apiMappers';
import DemoBadge from '../../components/common/DemoBadge';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import ItemLocale from '../../components/Admin/ItemLocale';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';
import ActiveFilter from '../../components/Admin/ActiveFilter';
import useUrlParam from '../../hooks/useUrlParam';

/**
 * قائمتا «الأخبار» (/admin/news، التصنيف news) و«التحليلات» (/admin/analyses، غيره): الصفحة نفسها بنوعها من المسار.
 * الكتابة كلها في المحرّر (/admin/editor/post/…)، و«خبر جديد» يبدأ المسودّة بتصنيف news.
 * والقائمة للبحث والتصفية والحذف. كل لغة مادة مستقلة، فعمود «اللغة» لغة الصف.
 */
export default function AdminPosts() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const news = !useLocation().pathname.startsWith('/admin/analyses');
  const kind = news ? 'news' : 'analysis';
  const title = t(news ? 'adminPosts.newsTitle' : 'adminPosts.analysesTitle');
  // المرشّحات في العنوان (docs/ADMIN-UX.md §2): ?status= و?missing=en
  const [status, setStatus] = useUrlParam('status', 'all', CONTENT_STATUSES);
  const [missing, setMissing] = useUrlParam('missing', null, ['en']);
  const listPosts = useCallback((filters) => adminApi.listPostsForAdmin({ ...filters, kind }), [kind]);
  const { items, setItems, loading, loadingMore, error: listError, hasMore, loadMore, reload } = useAdminContent(listPosts, status, { missing });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  // الحذف بعد التأكيد: خطأ الخادم يبقى داخل النافذة.
  const remove = async () => {
    const item = toDelete;
    await adminApi.deletePost(item.id);
    setItems((list) => list.filter((x) => x.id !== item.id));
    setError('');
    notify(t('azraqAdmin.notice.deleted', { title: localizedField(item, 'title', lang) }));
  };

  const filtered = items.filter((item) => localizedField(item, 'title', lang).includes(search));

  return (
    <div>
      <TopBar title={title} />
      <div className="space-y-6 p-7 px-8">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{title}</h2>
            <Link to={news ? '/admin/editor/post/new?category=news' : '/admin/editor/post/new'} className="wp-btn-ink flex items-center gap-2 px-5 py-2.5 text-sm">
              <Plus size={16} aria-hidden="true" /> {t(news ? 'adminPosts.addNews' : 'adminPosts.addAnalysis')}
            </Link>
          </div>
        </FadeIn>

        {error && <Alert>{error}</Alert>}
        {listError && <ErrorState error={listError} onRetry={reload} />}

        <FadeIn>
          <Card>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <ContentStatusFilter value={status} onChange={setStatus} />
              {missing === 'en' && <ActiveFilter label={t('adminLists.activeFilter.missingEn')} onClear={() => setMissing(null)} />}
            </div>
            <label className="mb-4 flex items-center gap-2 rounded-xl bg-[#F6F9FC] px-3 py-2">
              <Search size={15} className="text-[var(--wp-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search')}
                aria-label={t('common.search')}
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>

            {loading ? (
              <p role="status" aria-busy="true" data-loading="" className="py-6 text-center text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--wp-text-muted)]">{t('common.noResults')}</p>
            ) : (
              <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={title}>
                <table className="w-full text-sm">
                  <caption className="sr-only">{title}</caption>
                  <thead>
                    <tr className="border-b border-[var(--wp-border)] text-start text-xs text-[var(--wp-text-muted)]">
                      <th scope="col" className="px-2 py-2 text-start">{t('adminPosts.postTitle')}</th>
                      {!news && <th scope="col" className="px-2 py-2 text-start">{t('adminPosts.category')}</th>}
                      <th scope="col" className="px-2 py-2 text-start">{t('adminBilingual.language')}</th>
                      <th scope="col" className="px-2 py-2 text-start">{t('adminPosts.publishedAt')}</th>
                      <th scope="col" className="px-2 py-2"><span className="sr-only">{t('admin.actions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      // عناصر بذرة العرض بلا هدف فتح: تبقى صفًّا عاديًّا.
                      const Row = item.isDemo ? 'tr' : ClickableRow;
                      return (
                      <Row key={item.id} className="border-b border-[var(--wp-border)] last:border-0">
                        <td className="px-2 py-3 font-medium text-[var(--wp-text)]">{item.isDemo ? localizedField(item, 'title', lang) : <RowLink to={`/admin/editor/post/${item.id}`}>{localizedField(item, 'title', lang)}</RowLink>}{isDraft(item) && <DraftBadge />} <DemoBadge show={item.isDemo} className="ms-1.5" /></td>
                        {!news && <td className="px-2 py-3 text-[var(--wp-text-3)]">{item.category}</td>}
                        <td className="px-2 py-3"><ItemLocale locale={item.locale} item={item} type="post" /></td>
                        <td className="px-2 py-3 text-[var(--wp-text-3)]">{formatShortDate(item.publishedAt)}</td>
                        <td className="px-2 py-3">
                          {/* عناصر بذرة العرض لا تُعدَّل ولا تُحذف من اللوحة (403 DemoContent)؛ تُزال بـ demo:purge فقط. */}
                          {!item.isDemo && (
                          <div className="flex justify-end gap-1">
                            {/* التعديل مكرّر للعنوان: خارج ترتيب التبويب */}
                            <Link to={`/admin/editor/post/${item.id}`} tabIndex={-1} aria-hidden="true" className="wp-icon-act hover:bg-[var(--wepal-primary-50)]" title={t('common.edit')}>
                              <Edit3 aria-hidden="true" className="text-[var(--wepal-primary-600)]" />
                            </Link>
                            <button type="button" onClick={() => setToDelete(item)} className="wp-icon-act hover:bg-[#fdeeee]" title={t('common.delete')} aria-label={`${t('common.delete')}: ${localizedField(item, 'title', lang)}`}>
                              <Trash2 aria-hidden="true" className="text-[var(--wepal-danger)]" />
                            </button>
                          </div>
                          )}
                        </td>
                      </Row>
                      );
                    })}
                  </tbody>
                </table>
                <LoadMore hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} className="mt-4" />
              </div>
            )}
          </Card>
        </FadeIn>
      </div>

      {toDelete && (
        <ConfirmDialog
          title={t('azraqAdmin.confirm.deleteTitle')}
          message={t('azraqAdmin.confirm.deleteMessage', { title: localizedField(toDelete, 'title', lang) })}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={remove}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
