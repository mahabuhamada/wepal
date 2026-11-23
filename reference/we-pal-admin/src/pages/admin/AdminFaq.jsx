import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, Eye, EyeOff, HelpCircle, Plus, Trash2 } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import ErrorState from '../../components/common/ErrorState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import DemoBadge from '../../components/common/DemoBadge';
import { Badge } from '../../components/common/Badge';
import ContentStatusFilter from '../../components/Admin/ContentStatusFilter';
import ItemLocale from '../../components/Admin/ItemLocale';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { localizedField } from '../../utils/contentStatus';
import { groupFaqByCategory, moveFaq } from '../../utils/faq';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';

/**
 * إدارة الأسئلة الشائعة (المرحلة 1 من خطة المساعد): ما تعرضه صفحة المساعدة ويقرؤه مربع «اسأل».
 * القائمة كاملة مجمّعة بالتصنيف؛ التحريك للأعلى والأسفل داخل التصنيف (حين تُعرض كل الحالات)،
 * والنشر وإلغاؤه من الصف. السؤال وجوابه يُكتبان في المحرّر (/admin/editor/faq/…)، وكل لغة سؤال مستقل.
 * أسئلة العرض (demo:seed) للقراءة فقط.
 */
export default function AdminFaq() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [status, setStatus] = useState('all');
  const [items, setItems] = useState(null);
  const [listError, setListError] = useState(null);
  const [error, setError] = useState('');
  const [rowBusy, setRowBusy] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => {
    setListError(null);
    return adminApi.listFaqForAdmin({ status })
      .then((res) => setItems(Array.isArray(res?.data) ? res.data : []))
      .catch(setListError);
  }, [status]);

  useEffect(() => {
    if (!USE_API) return;
    load();
  }, [load]);

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  const questionOf = (item) => localizedField(item, 'question', lang);
  const categoryLabel = (key) => t(`faq.categories.${key}`);
  // الترتيب يرسل كل أسئلة التصنيف: مع قائمة مرشّحة (مسودات أو منشور فقط) يفوته بعضها.
  const canReorder = status === 'all';

  const togglePublished = async (item) => {
    setRowBusy(item.id);
    setError('');
    try {
      const updated = await adminApi.updateFaq(item.id, { published: !item.published });
      setItems((list) => list.map((x) => (x.id === item.id ? { ...x, published: updated?.published ?? !item.published } : x)));
      notify(t(item.published ? 'adminFaq.unpublished' : 'adminFaq.published', { title: questionOf(item) }));
      if (status !== 'all') await load();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
    } finally {
      setRowBusy(null);
    }
  };

  const move = async (item, direction) => {
    const ids = moveFaq(items, item.id, direction);
    if (!ids) return;
    setRowBusy(item.id);
    setError('');
    try {
      await adminApi.reorderFaq(ids);
      notify(t('adminFaq.reordered'));
      await load();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
    } finally {
      setRowBusy(null);
    }
  };

  // الحذف بعد التأكيد: خطأ الخادم يبقى داخل النافذة.
  const remove = async () => {
    const item = toDelete;
    await adminApi.deleteFaq(item.id);
    setItems((list) => list.filter((x) => x.id !== item.id));
    notify(t('azraqAdmin.notice.deleted', { title: questionOf(item) }));
  };

  const groups = groupFaqByCategory(items ?? []);

  return (
    <div>
      <TopBar title={t('adminFaq.title')} />
      <div className="space-y-6 p-7 px-8">
        <PageHeader title={t('adminFaq.title')} subtitle={t('adminFaq.lead')} as="h2">
          <Button variant="secondary" to="/help">
            {t('adminFaq.viewPublic')}
          </Button>
          <Button to="/admin/editor/faq/new">
            <Plus aria-hidden="true" /> {t('adminFaq.add')}
          </Button>
        </PageHeader>

        {error && <Alert>{error}</Alert>}

        <Card>
          <div className="mb-4">
            <ContentStatusFilter value={status} onChange={setStatus} />
          </div>

          {listError ? (
            <ErrorState error={listError} onRetry={load} />
          ) : items === null ? (
            <p role="status" aria-busy="true" data-loading="" className="py-6 text-center text-body-sm text-ink-muted">{t('common.loading')}</p>
          ) : groups.length === 0 ? (
            <EmptyState icon={HelpCircle} title={status === 'all' ? t('adminFaq.empty') : t('common.noResults')} />
          ) : (
            <div className="afq-groups">
              {groups.map((group) => (
                <section key={group.category} className="afq-group" aria-labelledby={`afq-${group.category}`}>
                  <h3 id={`afq-${group.category}`} className="afq-group-title">
                    {categoryLabel(group.category)} <span className="afq-count">({group.items.length})</span>
                  </h3>
                  <ul className="afq-list">
                    {group.items.map((item) => {
                      const title = questionOf(item);
                      const upIds = canReorder && moveFaq(items, item.id, -1);
                      const downIds = canReorder && moveFaq(items, item.id, 1);
                      const working = rowBusy === item.id;
                      // أسئلة العرض بلا هدف فتح: تبقى عنصر قائمة عاديًّا.
                      const Row = item.isDemo ? 'li' : ClickableRow;
                      return (
                        <Row key={item.id} {...(item.isDemo ? {} : { as: 'li' })} className="afq-row">
                          <div className="afq-row-text">
                            <p className="afq-question">{item.isDemo ? title : <RowLink to={`/admin/editor/faq/${item.id}`}>{title}</RowLink>}</p>
                            <div className="afq-badges">
                              {!item.published && <Badge tone="warning">{t('adminApi.status.draft')}</Badge>}
                              <ItemLocale locale={item.locale} item={item} type="faq" />
                              <DemoBadge show={item.isDemo} />
                            </div>
                          </div>
                          {/* أسئلة العرض لا تُعدَّل ولا تُحذف ولا تُرتَّب (403 DemoContent)؛ تُزال بـ demo:purge فقط. */}
                          {!item.isDemo && (
                            <div className="afq-actions">
                              {canReorder && (
                                <>
                                  <Button variant="ghost" iconOnly disabled={!upIds || working} onClick={() => move(item, -1)} aria-label={`${t('adminFaq.moveUp')}: ${title}`} title={t('adminFaq.moveUp')}>
                                    <ArrowUp aria-hidden="true" />
                                  </Button>
                                  <Button variant="ghost" iconOnly disabled={!downIds || working} onClick={() => move(item, 1)} aria-label={`${t('adminFaq.moveDown')}: ${title}`} title={t('adminFaq.moveDown')}>
                                    <ArrowDown aria-hidden="true" />
                                  </Button>
                                </>
                              )}
                              <Button variant="ghost" iconOnly loading={working} onClick={() => togglePublished(item)} aria-label={`${t(item.published ? 'adminFaq.unpublish' : 'adminFaq.publish')}: ${title}`} title={t(item.published ? 'adminFaq.unpublish' : 'adminFaq.publish')}>
                                {item.published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                              </Button>
                              {/* التعديل مكرّر للسؤال: خارج ترتيب التبويب */}
                              <Button variant="ghost" iconOnly to={`/admin/editor/faq/${item.id}`} tabIndex={-1} aria-hidden="true" title={t('common.edit')}>
                                <Edit3 aria-hidden="true" />
                              </Button>
                              <Button variant="ghost" iconOnly className="afq-delete" onClick={() => setToDelete(item)} aria-label={`${t('common.delete')}: ${title}`} title={t('common.delete')}>
                                <Trash2 aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </Row>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>

      {toDelete && (
        <ConfirmDialog
          title={t('azraqAdmin.confirm.deleteTitle')}
          message={t('azraqAdmin.confirm.deleteMessage', { title: questionOf(toDelete) })}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={remove}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
