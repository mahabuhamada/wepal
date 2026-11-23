import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, PenLine, Users, CalendarCheck } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import { ClickableRow, RowButton } from '../../components/common/ClickableRow';
import FadeIn from '../../components/common/FadeIn';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import OutcomeEditorDialog from '../../components/Admin/OutcomeEditorDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { listPendingOutcomes } from '../../api/admin';
import { formatShortDate } from '../../utils/apiMappers';

/**
 * «ينتظر خلاصة» (الحزمة 6أ، نمط Go Vocal): كل استطلاع أو تصويت أو مشاورة أُغلق يبقى في هذه القائمة
 * حتى تُكتب له خلاصة «سألنا / قلتم / فعلنا» وتُنشر، فيصل إشعار لكل من شارك ويخرج من القائمة.
 */
export default function AdminOutcomes() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(USE_API);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPendingOutcomes();
      setItems(res?.items ?? []);
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

  const same = (a, b) => a.subjectType === b.subjectType && a.subjectId === b.subjectId;

  return (
    <div>
      <TopBar title={t('outcome6a.admin.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('outcome6a.admin.title')}</h2>
          <p className="text-sm text-[var(--wp-text-3)]">{t('outcome6a.admin.subtitle')}</p>
        </FadeIn>

        <h3 className="text-base font-bold text-[var(--wp-ink)]">
          {t('outcome6a.admin.pendingTitle')} {!loading && !error && <span className="text-[var(--wp-text-muted)]">({items.length})</span>}
        </h3>

        {loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
        {error && <ErrorState error={error} onRetry={load} />}
        {!loading && !error && items.length === 0 && <EmptyState icon={ClipboardCheck} title={t('outcome6a.admin.empty')} />}

        {items.length > 0 && (
          <ul className="space-y-3" aria-label={t('outcome6a.admin.pendingTitle')}>
            {items.map((item) => (
              // البطاقة كلها تفتح محرّر الخلاصة (docs/ADMIN-UX.md)
              <ClickableRow as="li" key={`${item.subjectType}:${item.subjectId}`} className="ui-card flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--wp-text)]"><RowButton onClick={() => setEditing(item)}>{item.title}</RowButton></h4>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--wp-text-muted)]">
                      <span className="rounded-full bg-[var(--wp-info-tint)] px-2.5 py-0.5 font-semibold text-[var(--wp-text-2)]">{t(`outcome6a.admin.types.${item.subjectType}`)}</span>
                      <span className="flex items-center gap-1"><Users size={12} aria-hidden="true" /> {t('outcome6a.admin.participants', { count: item.participantsCount ?? 0 })}</span>
                      {item.closedAt && <span className="flex items-center gap-1"><CalendarCheck size={12} aria-hidden="true" /> {t('outcome6a.admin.closedOn', { date: formatShortDate(item.closedAt, lang) })}</span>}
                      {item.hasDraft && <span className="rounded-full bg-[var(--wp-success-tint)] px-2.5 py-0.5 font-semibold text-[var(--wp-success)]">{t('outcome6a.admin.hasDraft')}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="wp-btn-ink flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs"
                    aria-label={`${t(item.hasDraft ? 'outcome6a.admin.continue' : 'outcome6a.admin.write')} — ${item.title}`}
                  >
                    <PenLine size={12} aria-hidden="true" /> {t(item.hasDraft ? 'outcome6a.admin.continue' : 'outcome6a.admin.write')}
                  </button>
              </ClickableRow>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <OutcomeEditorDialog
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems((list) => list.map((i) => (same(i, saved) ? { ...i, hasDraft: true } : i)));
            notify(t('outcome6a.admin.saved', { title: saved.title }));
          }}
          onPublished={(done) => {
            setItems((list) => list.filter((i) => !same(i, done)));
            notify(t('outcome6a.admin.published', { title: done.title }));
          }}
        />
      )}
    </div>
  );
}
