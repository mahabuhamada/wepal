import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useLanguage } from '../../i18n/LanguageContext';
import { updateConsultationReport } from '../../api/admin';
import {
  REPORT_LIMITS, emptyGroup, emptyStatement, formToReport, reportToForm, validateReportForm,
} from '../../utils/consultationReport';
import Alert from '../ui/Alert';

const inputCls = 'wp-input w-full px-3 py-2 text-sm';

/**
 * إدخال تقرير الاستشارة أو تعديله (B7.4): الملخص، وأبرز العبارات بنسب الموافقة/الرفض،
 * ومجموعات الرأي بنسبها. يُحفظ بـ PATCH /consultations/{id} { report }.
 */
export default function ConsultationReportDialog({ consultation, onClose, onSaved }) {
  const { t } = useLanguage();
  const summaryRef = useRef(null);
  const [form, setForm] = useState(() => reportToForm(consultation.report));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setRow = (list, idx, field) => (e) => setForm((f) => ({
    ...f,
    [list]: f[list].map((row, i) => (i === idx ? { ...row, [field]: e.target.value } : row)),
  }));
  const addRow = (list, make) => setForm((f) => ({ ...f, [list]: [...f[list], make()] }));
  const removeRow = (list, idx) => setForm((f) => ({ ...f, [list]: f[list].filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validateReportForm(form);
    if (invalid) {
      setError(t(invalid.key, invalid.params));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateConsultationReport(consultation.id, formToReport(form));
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('consultationReportForm.title', { title: consultation.title })} onClose={busy ? undefined : onClose} initialFocusRef={summaryRef} size="lg">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('consultationReportForm.summary')}</span>
            <textarea ref={summaryRef} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={4} maxLength={REPORT_LIMITS.summaryMax} className={inputCls} />
          </label>
          <span className="mt-1 block text-[11px] text-[var(--wp-text-muted)]" aria-live="polite">{form.summary.trim().length} / {REPORT_LIMITS.summaryMax}</span>
        </div>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-[var(--wp-text-2)]">{t('consultationReportForm.statements')}</legend>
          <div className="space-y-2">
            {form.topStatements.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2" role="group" aria-label={t('consultationReportForm.statementN', { n: i + 1 })}>
                <input value={s.text} onChange={setRow('topStatements', i, 'text')} maxLength={500} placeholder={t('consultationReportForm.statementText')} aria-label={t('consultationReportForm.statementText')} className={`${inputCls} min-w-[200px] flex-1`} />
                <input value={s.agree} onChange={setRow('topStatements', i, 'agree')} inputMode="numeric" placeholder="%" aria-label={t('consultationReportForm.agree')} className={`${inputCls} w-20`} />
                <input value={s.disagree} onChange={setRow('topStatements', i, 'disagree')} inputMode="numeric" placeholder="%" aria-label={t('consultationReportForm.disagree')} className={`${inputCls} w-20`} />
                <button type="button" onClick={() => removeRow('topStatements', i)} aria-label={t('consultationReportForm.remove')} className="wp-icon-act"><Trash2 aria-hidden="true" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addRow('topStatements', emptyStatement)} disabled={form.topStatements.length >= REPORT_LIMITS.statements} className="mt-2 flex items-center gap-1 text-xs text-[var(--wp-text-3)] hover:text-[var(--wp-coral)] disabled:opacity-40">
            <Plus size={12} /> {t('consultationReportForm.addStatement')}
          </button>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-bold text-[var(--wp-text-2)]">{t('consultationReportForm.groups')}</legend>
          <div className="space-y-2">
            {form.groups.map((g, i) => (
              <div key={i} className="rounded-xl border border-[var(--wp-border)] p-2 space-y-2" role="group" aria-label={t('consultationReportForm.groupN', { n: i + 1 })}>
                <div className="flex items-center gap-2">
                  <input value={g.name} onChange={setRow('groups', i, 'name')} maxLength={100} placeholder={t('consultationReportForm.groupName')} aria-label={t('consultationReportForm.groupName')} className={`${inputCls} flex-1`} />
                  <input value={g.percentage} onChange={setRow('groups', i, 'percentage')} inputMode="numeric" placeholder="%" aria-label={t('consultationReportForm.percentage')} className={`${inputCls} w-20`} />
                  <button type="button" onClick={() => removeRow('groups', i)} aria-label={t('consultationReportForm.remove')} className="wp-icon-act"><Trash2 aria-hidden="true" /></button>
                </div>
                <textarea value={g.description} onChange={setRow('groups', i, 'description')} rows={2} maxLength={1000} placeholder={t('consultationReportForm.groupDescription')} aria-label={t('consultationReportForm.groupDescription')} className={inputCls} />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addRow('groups', emptyGroup)} disabled={form.groups.length >= REPORT_LIMITS.groups} className="mt-2 flex items-center gap-1 text-xs text-[var(--wp-text-3)] hover:text-[var(--wp-coral)] disabled:opacity-40">
            <Plus size={12} /> {t('consultationReportForm.addGroup')}
          </button>
        </fieldset>

        {error && (
          <Alert size="sm">{error}</Alert>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm text-[var(--wp-text-2)] hover:bg-[#F6F6F6] disabled:opacity-50">{t('common.cancel')}</button>
          <button type="submit" disabled={busy} className="wp-btn-ink rounded-xl px-4 py-2 text-sm disabled:opacity-50">{busy ? t('common.saving') : t('consultationReportForm.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
