import { useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Select } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { assignToWorkspace, canApplyPlan, removeFromWorkspace } from '../../../api/distribution';
import PlanSummary, { StatusPill } from './PlanSummary';

/**
 * فعل جماعي على المحدَّدين (القرار 3): «أضف إلى مساحة» بدور عضو أو قائد، أو «انقل» من المساحة المعروضة، أو «أزل» منها.
 * خطوتان: اختيار ثم معاينة من الخادم (dryRun، بالحساب نفسه الذي يحفظ) ثم تأكيد. لا حفظ مع مساحة تتجاوز حدها.
 *
 * mode: add | move | remove. from: المساحة المعروضة {id, title} (للنقل والإزالة).
 */
export default function DistributeDialog({ mode, userIds, from = null, workspaces = [], onClose, onDone }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [projectId, setProjectId] = useState(mode === 'remove' ? from?.id ?? '' : '');
  const [role, setRole] = useState('MEMBER');
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const payload = { userIds, projectId, role, fromProjectId: mode === 'move' ? from?.id : null };
  const call = (dryRun) => (mode === 'remove'
    ? removeFromWorkspace({ userIds, projectId }, { dryRun })
    : assignToWorkspace(payload, { dryRun }));

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const doPreview = () => run(async () => setPlan(await call(true)));
  const doApply = () => run(async () => {
    const res = await call(false);
    onDone?.(res, mode);
  });

  const targets = workspaces.filter((w) => w.id !== from?.id);

  return (
    <Modal title={t(`adminDistribution.dialog.title.${mode}`)} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="lg">
      <p className="text-sm text-[var(--wp-text-2)] leading-relaxed">{t(`adminDistribution.dialog.lead.${mode}`, { count: userIds.length, from: from?.title ?? '' })}</p>

      {!plan && mode !== 'remove' && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t('adminDistribution.dialog.workspace')}>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{t('adminDistribution.dialog.pick')}</option>
              {targets.map((w) => (
                <option key={w.id} value={w.id}>{`${w.title} (${t('adminDistribution.capacity.count', { count: w.membersCount, max: w.max })})`}</option>
              ))}
            </Select>
          </Field>
          {mode === 'add' && (
            <fieldset>
              <legend className="text-sm font-medium mb-2">{t('adminDistribution.dialog.role')}</legend>
              <div className="flex gap-4">
                {['MEMBER', 'LEADER'].map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="distribution-role" value={r} checked={role === r} onChange={() => setRole(r)} />
                    {t(`adminDistribution.dialog.roles.${r}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {plan && (
        <div className="mt-4 space-y-3" role="status">
          <h3 className="text-sm font-semibold">{t('adminDistribution.dialog.previewTitle')}</h3>
          <ul className="max-h-60 overflow-y-auto rounded-xl border border-[var(--wp-border)] divide-y divide-[var(--wp-border)]">
            {plan.rows.map((r) => (
              <li key={r.userId} className="flex items-center justify-between gap-3 p-2 text-sm">
                <span>{r.name || '—'}</span>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
          <PlanSummary plan={plan} />
          <p className="text-xs text-[var(--wp-text-muted)]">{t(mode === 'remove' ? 'adminDistribution.dialog.notifyRemove' : 'adminDistribution.dialog.notify')}</p>
        </div>
      )}

      {error && <Alert size="sm" className="mt-3">{error}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        {plan ? (
          <>
            <Button ref={cancelRef} variant="ghost" size="sm" onClick={() => setPlan(null)} disabled={busy}>{t('adminDistribution.dialog.back')}</Button>
            <Button size="sm" onClick={doApply} loading={busy} disabled={!canApplyPlan(plan)}>
              {t(mode === 'remove' ? 'adminDistribution.dialog.confirmRemove' : 'adminDistribution.dialog.confirm')}
            </Button>
          </>
        ) : (
          <>
            <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
            <Button size="sm" onClick={doPreview} loading={busy} disabled={!projectId}>{t('adminDistribution.dialog.preview')}</Button>
          </>
        )}
      </div>
    </Modal>
  );
}
