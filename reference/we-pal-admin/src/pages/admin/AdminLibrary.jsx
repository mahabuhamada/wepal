import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Edit3, Trash2, Search, Plus } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import useAdminContent from '../../hooks/useAdminContent';
import ContentStatusFilter, { DraftBadge } from '../../components/Admin/ContentStatusFilter';
import LoadMore from '../../components/common/LoadMore';
import { isDraft, localizedField } from '../../utils/contentStatus';
import { resourceTypeLabel, formatShortDate } from '../../utils/apiMappers';
import DemoBadge from '../../components/common/DemoBadge';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import ItemLocale from '../../components/Admin/ItemLocale';
import { LibraryOverview } from '../../components/Admin/ListOverviews';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';
import ActiveFilter from '../../components/Admin/ActiveFilter';
import useUrlParam from '../../hooks/useUrlParam';
import { CONTENT_STATUSES } from '../../utils/contentStatus';

const statusColors = {
  'منشور': { bg: 'var(--wp-success-tint)', text: 'var(--wp-success)' },
  'مسودة': { bg: '#F0F0F0', text: 'var(--wp-text-3)' },
  'قيد المراجعة': { bg: 'var(--wp-warning-tint)', text: 'var(--wp-warning)' },
};

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminLibrary() {
  const { t } = useLanguage();
  const { adminLibraryItems } = useLocalizedData();
  const [search, setSearch] = useState('');

  const filtered = adminLibraryItems.filter((item) => item.title.includes(search));

  return (
    <div>
      <TopBar title={t('adminLibrary.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminLibrary.title')}</h2>
            <button className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
              <Upload size={16} /> {t('adminLibrary.addResource')}
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="relative max-w-xs">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('publicLibrary.searchPlaceholder')}
              className="wp-input w-full ps-8 pe-3 py-2 text-sm"
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--wp-border)] text-[var(--wp-text-muted)] text-xs">
                  <th className="text-start py-3 px-2 font-medium">{t('admin.name')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('adminLibrary.category')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.status')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('common.views')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.date')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const sc = statusColors[item.status] || statusColors['مسودة'];
                  return (
                    <tr key={item.id} className="border-b border-[var(--wp-border)] hover:bg-[#F6F6F6]">
                      <td className="py-3 px-2 font-medium text-[var(--wp-text)]">{item.title}</td>
                      <td className="py-3 px-2 text-[var(--wp-text-muted)]">{item.category}</td>
                      <td className="py-3 px-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{item.status}</span>
                      </td>
                      <td className="py-3 px-2 text-[var(--wp-text-muted)]">{item.views.toLocaleString()}</td>
                      <td className="py-3 px-2 text-[var(--wp-text-muted)]">{item.date}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <button className="p-1.5 hover:bg-[var(--wp-info-tint)] rounded-lg" title={t('common.edit')}><Edit3 size={14} className="text-[var(--wp-info)]" /></button>
                          <button className="p-1.5 hover:bg-[var(--wp-coral-wash)] rounded-lg" title={t('common.delete')}><Trash2 size={14} className="text-[var(--wp-coral-deep)]" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

// ===== وضع الـ API (بيانات حيّة) =====
// الكتابة والنوع والملف والغلاف في المحرّر (/admin/editor/resource/…)، والقائمة للبحث والتصفية والحذف.
function ApiAdminLibrary() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  // المرشّحات في العنوان: بطاقات «نظرة عامة» وتذكير الترجمة في الرئيسية تفتح القائمة مرشَّحة (docs/ADMIN-UX.md §2)
  const [status, setStatus] = useUrlParam('status', 'all', CONTENT_STATUSES);
  const [type, setType] = useUrlParam('type');
  const [missing, setMissing] = useUrlParam('missing', null, ['en']);
  const [origin, setOrigin] = useUrlParam('origin', null, ['workspace']);
  const { items, setItems, loading, loadingMore, error: listError, hasMore, loadMore, reload } = useAdminContent(adminApi.listResourcesForAdmin, status, { type, missing, origin });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [toDelete, setToDelete] = useState(null);

  // الحذف بعد التأكيد: خطأ الخادم يبقى داخل النافذة.
  const remove = async () => {
    const item = toDelete;
    await adminApi.deleteResource(item.id);
    setItems((list) => list.filter((x) => x.id !== item.id));
    setError('');
    notify(t('azraqAdmin.notice.deleted', { title: localizedField(item, 'title', lang) }));
  };

  const filtered = items.filter((item) => localizedField(item, 'title', lang).includes(search));

  return (
    <div>
      <TopBar title={t('adminLibrary.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminLibrary.title')}</h2>
            <Link to="/admin/editor/resource/new" className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
              <Plus size={16} aria-hidden="true" /> {t('adminLibrary.addResource')}
            </Link>
          </div>
        </FadeIn>

        {error && <Alert>{error}</Alert>}
        {listError && <ErrorState error={listError} onRetry={reload} />}

        <LibraryOverview status={status} />

        <FadeIn delay={0.05}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('publicLibrary.searchPlaceholder')} aria-label={t('publicLibrary.searchPlaceholder')} className="wp-input w-full ps-8 pe-3 py-2 text-sm" />
            </div>
            <ContentStatusFilter value={status} onChange={setStatus} />
            {type && <ActiveFilter label={t('adminLists.activeFilter.type', { type: resourceTypeLabel(type, lang) })} onClear={() => setType(null)} />}
            {missing === 'en' && <ActiveFilter label={t('adminLists.activeFilter.missingEn')} onClear={() => setMissing(null)} />}
            {origin === 'workspace' && <ActiveFilter label={t('adminLists.activeFilter.fromWorkspaces')} onClear={() => setOrigin(null)} />}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <div className="relative" tabIndex={0} role="region" aria-label={t('adminLibrary.title')}>
            <table className="w-full text-sm" aria-busy={loading}>
              <caption className="sr-only">{t('adminLibrary.title')}</caption>
              <thead>
                <tr className="border-b border-[var(--wp-border)] text-[var(--wp-text-muted)] text-xs">
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.name')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('adminLibrary.category')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('adminBilingual.language')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('common.views')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.date')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} role="status" data-loading="" className="py-6 text-center text-[var(--wp-text-muted)]">{t('common.loading')}</td></tr>}
                {!loading && filtered.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-[var(--wp-text-muted)]">{t('common.noResults')}</td></tr>}
                {!loading && filtered.map((item) => {
                  const title = localizedField(item, 'title', lang);
                  // عناصر بذرة العرض لا تُعدَّل ولا تُحذف من اللوحة (403 DemoContent)؛ تُزال بـ demo:purge فقط.
                  const Row = item.isDemo ? 'tr' : ClickableRow;
                  return (
                  <Row key={item.id} className="border-b border-[var(--wp-border)] hover:bg-[#F6F6F6]">
                    <td className="py-3 px-2 font-medium text-[var(--wp-text)]">{item.isDemo ? title : <RowLink to={`/admin/editor/resource/${item.id}`}>{title}</RowLink>}{isDraft(item) && <DraftBadge />} <DemoBadge show={item.isDemo} className="ms-1.5" /></td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{item.type ? resourceTypeLabel(item.type, lang) : '—'}</td>
                    <td className="py-3 px-2"><ItemLocale locale={item.locale} item={item} type="resource" /></td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{(item.viewCount ?? 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{formatShortDate(item.publishedAt, lang)}</td>
                    <td className="py-3 px-2">
                      {!item.isDemo && (
                      <div className="flex gap-1">
                        {/* التعديل مكرّر للعنوان: خارج ترتيب التبويب، وقارئ الشاشة يصل إليه من العنوان */}
                        <Link to={`/admin/editor/resource/${item.id}`} tabIndex={-1} aria-hidden="true" className="wp-icon-act hover:bg-[var(--wp-info-tint)]" title={t('common.edit')}><Edit3 aria-hidden="true" className="text-[var(--wp-info)]" /></Link>
                        <button type="button" onClick={() => setToDelete(item)} className="wp-icon-act hover:bg-[var(--wp-coral-wash)]" title={t('common.delete')} aria-label={`${t('common.delete')}: ${title}`}><Trash2 aria-hidden="true" className="text-[var(--wp-coral-deep)]" /></button>
                      </div>
                      )}
                    </td>
                  </Row>
                  );
                })}
              </tbody>
            </table>
            </div>
            <LoadMore hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} className="mt-4" />
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

export default function AdminLibrary() {
  if (!USE_API) return <MockAdminLibrary />;
  return <ApiAdminLibrary />;
}
