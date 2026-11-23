import { useCallback, useEffect, useState } from 'react';
import { FileText, MessagesSquare, Plus, Trash2, Users } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import { ClickableRow, RowButton } from '../../components/common/ClickableRow';
import FadeIn from '../../components/common/FadeIn';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import ConsultationReportDialog from '../../components/Admin/ConsultationReportDialog';
import CreateConsultationDialog from '../../components/Admin/CreateConsultationDialog';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { listConsultations } from '../../api/platform';
import { updateConsultationReport } from '../../api/admin';
import DemoBadge from '../../components/common/DemoBadge';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';

/**
 * الاستشارات في الإدارة: إنشاء استشارة بمحادثة Pol.is (ملاحظة هلا هـ-2)، وإدخال «تقرير الاستشارة» أو تعديله
 * أو حذفه (B7.4)، فيظهر للأعضاء في صفحة تقرير الاستشارة بدل «التقرير غير منشور بعد».
 */
export default function AdminConsultations() {
  const { t } = useLanguage();
  const notify = useAdminNotice();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(USE_API);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listConsultations());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_API) load();
  }, [load]);

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  const removeReport = async () => {
    await updateConsultationReport(removing.id, null);
    setItems((list) => list.map((c) => (c.id === removing.id ? { ...c, report: null } : c)));
    notify(t('azraqAdmin.notice.consultationReportRemoved', { title: removing.title }));
  };

  return (
    <div>
      <TopBar title={t('adminConsultations.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="wp-page-title">{t('adminConsultations.title')}</h2>
              <p className="text-sm text-[var(--wp-text-3)]">{t('adminConsultations.subtitle')}</p>
            </div>
            <button type="button" onClick={() => setCreating(true)} className="wp-btn-ink flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm">
              <Plus size={14} aria-hidden="true" /> {t('adminConsultations.create.open')}
            </button>
          </div>
        </FadeIn>

        {loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
        {error && <ErrorState error={error} onRetry={load} />}
        {!loading && !error && items.length === 0 && <EmptyState icon={MessagesSquare} title={t('adminConsultations.empty')} />}

        <ul className="space-y-3" aria-label={t('adminConsultations.title')}>
          {items.map((c) => {
            const Row = c.isDemo ? 'li' : ClickableRow;
            return (
            // البطاقة كلها تفتح نافذة التقرير (docs/ADMIN-UX.md)؛ عناصر بذرة العرض بلا إجراء فتبقى بطاقة عادية
            <Row key={c.id} {...(c.isDemo ? {} : { as: 'li' })} className="ui-card flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--wp-text)]">{c.isDemo ? c.title : <RowButton onClick={() => setEditing(c)}>{c.title}</RowButton>} <DemoBadge show={c.isDemo} className="ms-1.5" /></h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--wp-text-muted)]">
                    <span className="flex items-center gap-1"><Users size={12} /> {c.participantsCount ?? 0} {t('consultationReport.participants')}</span>
                    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${c.report ? 'bg-[var(--wp-success-tint)] text-[var(--wp-success)]' : 'bg-[#F0F0F0] text-[var(--wp-text-3)]'}`}>
                      {t(c.report ? 'adminConsultations.hasReport' : 'adminConsultations.noReport')}
                    </span>
                  </div>
                </div>
                {/* عناصر بذرة العرض لا تُعدَّل ولا تُحذف من اللوحة (403 DemoContent)؛ تُزال بـ demo:purge فقط. */}
                {!c.isDemo && (
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEditing(c)} className="wp-btn-ink flex items-center gap-1 rounded-xl px-3 py-2 text-xs" aria-label={`${t(c.report ? 'adminConsultations.editReport' : 'adminConsultations.addReport')} — ${c.title}`}>
                    <FileText size={12} /> {t(c.report ? 'adminConsultations.editReport' : 'adminConsultations.addReport')}
                  </button>
                  {c.report && (
                    <button type="button" onClick={() => setRemoving(c)} className="flex items-center gap-1 rounded-xl bg-[var(--wp-coral-wash)] px-3 py-2 text-xs text-[var(--wp-coral-deep)] hover:opacity-90" aria-label={`${t('adminConsultations.removeReport')} — ${c.title}`}>
                      <Trash2 size={12} /> {t('adminConsultations.removeReport')}
                    </button>
                  )}
                </div>
                )}
            </Row>
            );
          })}
        </ul>
      </div>

      {creating && (
        <CreateConsultationDialog
          onClose={() => setCreating(false)}
          onCreated={async () => {
            notify(t('adminConsultations.create.done'));
            await load();
          }}
        />
      )}
      {editing && (
        <ConsultationReportDialog
          consultation={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            notify(t('azraqAdmin.notice.consultationReportSaved', { title: editing.title }));
            await load();
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={t('adminConsultations.removeTitle')}
          message={t('adminConsultations.removeMessage', { title: removing.title })}
          confirmLabel={t('adminConsultations.removeReport')}
          danger
          onConfirm={removeReport}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
