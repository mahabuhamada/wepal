import { useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Input } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { updateInvitationBatch } from '../../../api/invitationBatches';
import {
  BATCH_LIMITS, editBatchErrors, editBatchForm, editBatchPayload, liveCount, minBatchCount,
} from '../../../utils/invitationBatches';

/**
 * تعديل دفعة: اسمها وعدد أكوادها الباقية. الزيادة تولّد أكوادًا، والإنقاص يحذف غير المستعمل الذي لم يُنسخ
 * ولم يُرسل (الخادم يتحقق من الحد الأدنى). onSaved({batch, codes}) بعد النجاح، أو بلا طلب إن لم يتغيّر شيء.
 */
export default function EditBatchDialog({ batch, onClose, onSaved }) {
  const { t } = useLanguage();
  const nameRef = useRef(null);
  const [form, setForm] = useState(() => editBatchForm(batch));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = 'inviteBatches.edit';
  const min = minBatchCount(batch);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (field) => {
    const v = errors[field];
    if (!v) return undefined;
    return typeof v === 'string' ? v : t(v[0], v[1]);
  };

  const submit = async (e) => {
    e.preventDefault();
    const invalid = editBatchErrors(form, batch);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    const body = editBatchPayload(form, batch);
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      onSaved(await updateInvitationBatch(batch.id, body));
    } catch (ex) {
      // خطأ حقل من الخادم (422) يظهر بجانب حقله، وغيره في أعلى النافذة
      if (ex?.field === 'name' || ex?.field === 'count') setErrors({ [ex.field]: ex.message });
      else setError(ex?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(`${k}.title`)} onClose={busy ? undefined : onClose} initialFocusRef={nameRef}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t(`${k}.name`)} error={err('name')}>
          <Input ref={nameRef} maxLength={BATCH_LIMITS.nameMax} value={form.name} onChange={set('name')} />
        </Field>
        <Field label={t(`${k}.count`)} hint={t(`${k}.countHint`, { live: liveCount(batch.counts), min })} error={err('count')}>
          <Input type="number" inputMode="numeric" min={min} max={BATCH_LIMITS.countMax} value={form.count} onChange={set('count')} />
        </Field>
        {error && <Alert size="sm">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t(`${k}.cancel`)}</Button>
          <Button type="submit" loading={busy}>{busy ? t(`${k}.saving`) : t(`${k}.submit`)}</Button>
        </div>
      </form>
    </Modal>
  );
}
