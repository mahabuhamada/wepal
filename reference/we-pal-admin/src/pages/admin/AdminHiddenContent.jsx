import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import { isAdmin } from '../../utils/roles';
import { relativeTime } from '../../utils/apiMappers';
import * as adminApi from '../../api/admin';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';

const TYPES = ['comment', 'idea', 'group_post', 'group_post_comment'];
const REASON_MIN = 10;

/**
 * «المحتوى المخفي» (سلة الإشراف، القرار 10): ما أخفاه الإشراف من بلاغ، بمرشّح النوع وعدد كلٍّ منها.
 * المشرف والمدير يسترجعان؛ والحذف النهائي للمدير، وقبل انتهاء مدة السلة بسبب مكتوب (يفرضه الخادم أيضًا).
 */
export default function AdminHiddenContent() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const notify = useAdminNotice();
  const [type, setType] = useState('');
  const [state, setState] = useState({ loading: true, error: null, items: [], counts: {}, retentionDays: 30 });
  const [restoring, setRestoring] = useState(null);
  const [purging, setPurging] = useState(null);

  const load = useCallback(async () => {
    if (!USE_API) {
      setState({ loading: false, error: null, items: [], counts: {}, retentionDays: 30 });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await adminApi.listHiddenContent(type);
      setState({ loading: false, error: null, items: res?.data ?? [], counts: res?.counts ?? {}, retentionDays: res?.retentionDays ?? 30 });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const total = TYPES.reduce((sum, key) => sum + (state.counts[key] ?? 0), 0);
  const canPurge = isAdmin(user);

  return (
    <div>
      <TopBar title={t('adminHidden.title')} />
      <div className="p-7 px-8 space-y-6">
        <div>
          <h2 className="wp-page-title">{t('adminHidden.title')}</h2>
          <p className="text-sm text-[var(--wp-text-muted)] mt-1 max-w-2xl">{t('adminHidden.intro', { days: state.retentionDays })}</p>
        </div>

        <div className="flex gap-2 flex-wrap" role="group" aria-label={t('adminHidden.title')}>
          {['', ...TYPES].map((key) => (
            <button
              key={key || 'all'}
              type="button"
              aria-pressed={type === key}
              onClick={() => setType(key)}
              className={`rounded-full px-4 py-[9px] text-body-sm font-semibold transition-colors ${
                type === key ? 'bg-[var(--wp-ink)] text-white' : 'bg-white border border-[var(--wp-border-2)] text-[var(--wp-text-3)] hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]'
              }`}
            >
              {key ? t(`adminHidden.types.${key}`) : t('adminHidden.all')} <span className="tabular-nums opacity-70">{key ? state.counts[key] ?? 0 : total}</span>
            </button>
          ))}
        </div>

        {state.error && <ErrorState error={state.error} onRetry={load} />}
        {state.loading && (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            {[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-[#F0F0F0] animate-pulse" />)}
          </div>
        )}
        {!state.loading && !state.error && state.items.length === 0 && (
          <div className="rounded-2xl bg-[#F6F6F6] border border-[var(--wp-border)] p-6 text-sm text-[var(--wp-text-muted)] text-center">{t('adminHidden.empty')}</div>
        )}

        {!state.loading && (
          <ul className="space-y-3">
            {state.items.map((item) => {
              const purgeable = item.purgeableAt && new Date(item.purgeableAt) <= new Date();
              return (
                <li key={`${item.type}-${item.id}`}>
                  <Card className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--wp-text-muted)] mb-1">{t(`adminHidden.types.${item.type}`)}</p>
                      <p className="text-sm text-[var(--wp-text)] mb-2 break-words">{item.preview || '—'}</p>
                      <div className="flex gap-4 text-xs text-[var(--wp-text-muted)] flex-wrap">
                        <span>{t('adminHidden.author')}: {item.author?.name || '—'}</span>
                        <span>{t('adminHidden.hiddenBy')}: {item.hiddenBy?.name || '—'} · {relativeTime(item.hiddenAt, lang, t)}</span>
                        {item.reason && <span>{t('adminHidden.reason')}: {item.reason}</span>}
                        {item.reportsCount > 0 && <span>{t('adminHidden.reports', { count: item.reportsCount })}</span>}
                        <span>{purgeable ? t('adminHidden.purgeableNow') : t('adminHidden.purgeableIn', { date: new Date(item.purgeableAt).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB') })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => setRestoring(item)} className="flex items-center gap-1 px-3 py-2 bg-[var(--wp-mint-wash,#E8F7F1)] text-[var(--wp-text-2)] rounded-xl text-xs">
                        <RotateCcw size={14} aria-hidden="true" /> {t('adminHidden.restore')}
                      </button>
                      {canPurge && (
                        <button type="button" onClick={() => setPurging({ ...item, purgeable })} className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                          <Trash2 size={14} aria-hidden="true" /> {t('adminHidden.purge')}
                        </button>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {restoring && (
        <ConfirmDialog
          title={t('adminHidden.restore')}
          message={t('adminHidden.confirmRestore')}
          confirmLabel={t('adminHidden.restore')}
          onConfirm={async () => {
            await adminApi.restoreHiddenContent(restoring.type, restoring.id);
            notify(t('adminHidden.restored'));
            await load();
          }}
          onClose={() => setRestoring(null)}
        />
      )}
      {purging && (
        <PurgeDialog
          item={purging}
          onConfirm={async (reason) => {
            await adminApi.purgeHiddenContent(purging.type, purging.id, reason);
            notify(t('adminHidden.purged'));
            await load();
          }}
          onClose={() => setPurging(null)}
        />
      )}
    </div>
  );
}

function PurgeDialog({ item, onConfirm, onClose }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsReason = !item.purgeable;
  const ready = !needsReason || reason.trim().length >= REASON_MIN;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminHidden.purgeTitle')} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <p className="text-sm leading-relaxed text-[var(--wp-text-2)]">{t('adminHidden.purgeBody')}</p>
      {needsReason && (
        <div className="mt-4">
          <label htmlFor="purge-reason" className="block text-xs font-semibold text-[var(--wp-text-2)] mb-1">{t('adminHidden.purgeReason')}</label>
          <p id="purge-reason-hint" className="text-xs text-[var(--wp-text-muted)] mb-1.5">{t('adminHidden.purgeReasonHint')}</p>
          <textarea id="purge-reason" rows={2} maxLength={500} aria-describedby="purge-reason-hint" value={reason} onChange={(e) => setReason(e.target.value)} className="wp-input w-full px-3 py-2 text-sm" />
        </div>
      )}
      {error && <Alert size="sm" className="mt-3">{error}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant="danger" size="sm" onClick={confirm} loading={busy} disabled={!ready}>
          {busy ? t('projectDetail.manage.working') : t('adminHidden.purge')}
        </Button>
      </div>
    </Modal>
  );
}
