import { useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Input, Select, Textarea } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { createInvitationBatch } from '../../../api/invitationBatches';
import { REGIONS, regionLabel } from '../../../utils/apiMappers';
import { TRACKS } from '../../../utils/proposals';
import { BATCH_LIMITS, batchFormErrors, batchPayload, emptyBatchForm } from '../../../utils/invitationBatches';

/** إنشاء دفعة دعوة. onCreated({batch, codes}) بعد النجاح. cohorts: [{key,name}] من meta قائمة الدفعات. */
export default function BatchFormDialog({ cohorts = [], onClose, onCreated }) {
  const { t, lang } = useLanguage();
  const nameRef = useRef(null);
  const [form, setForm] = useState(() => emptyBatchForm(cohorts));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = 'inviteBatches.form';

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (field) => (errors[field] ? t(errors[field]) : undefined);

  const submit = async (e) => {
    e.preventDefault();
    const invalid = batchFormErrors(form);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError('');
    try {
      const res = await createInvitationBatch(batchPayload(form));
      onCreated(res);
    } catch (ex) {
      setError(ex?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(`${k}.title`)} onClose={busy ? undefined : onClose} initialFocusRef={nameRef} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t(`${k}.name`)} hint={t(`${k}.nameHint`)} error={err('name')}>
          <Input ref={nameRef} maxLength={BATCH_LIMITS.nameMax} value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t(`${k}.region`)} error={err('region')}>
            <Select value={form.region} onChange={set('region')}>
              {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
            </Select>
          </Field>
          <Field label={t(`${k}.cohort`)} error={err('cohort')}>
            <Select value={form.cohort} onChange={set('cohort')}>
              {cohorts.length !== 1 && <option value="">—</option>}
              {cohorts.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={t(`${k}.track`)} hint={t(`${k}.trackHint`)}>
          <Select value={form.track} onChange={set('track')}>
            <option value="">{t(`${k}.trackAny`)}</option>
            {TRACKS.map((tr) => <option key={tr.value} value={tr.value}>{t(tr.labelKey)}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t(`${k}.count`)} hint={t(`${k}.countHint`)} error={err('count')}>
            <Input type="number" inputMode="numeric" min={BATCH_LIMITS.countMin} max={BATCH_LIMITS.countMax} value={form.count} onChange={set('count')} />
          </Field>
          <Field label={t(`${k}.days`)} error={err('expiresInDays')}>
            <Input type="number" inputMode="numeric" min={BATCH_LIMITS.daysMin} max={BATCH_LIMITS.daysMax} value={form.expiresInDays} onChange={set('expiresInDays')} />
          </Field>
        </div>
        <Field label={t(`${k}.note`)} optional={t(`${k}.optional`)} error={err('note')}>
          <Textarea rows={2} maxLength={BATCH_LIMITS.noteMax} value={form.note} onChange={set('note')} />
        </Field>
        <p className="flex items-start gap-2 text-sm text-[var(--wp-text-3)]">
          <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {t(`${k}.privacy`)}
        </p>
        {error && <Alert size="sm">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t(`${k}.cancel`)}</Button>
          <Button type="submit" loading={busy}>{busy ? t(`${k}.saving`) : t(`${k}.submit`)}</Button>
        </div>
      </form>
    </Modal>
  );
}
