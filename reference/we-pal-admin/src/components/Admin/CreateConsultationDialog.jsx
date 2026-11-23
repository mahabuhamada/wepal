import { useRef, useState } from 'react';
import Modal from '../common/Modal';
import BilingualField from './BilingualField';
import Alert from '../ui/Alert';
import { useLanguage } from '../../i18n/LanguageContext';
import { createConsultation } from '../../api/admin';
import { consultationPayload, emptyConsultationForm, validateConsultationForm } from '../../utils/consultationForm';

const inputCls = 'wp-input w-full px-3 py-2 text-sm';

/**
 * «استشارة جديدة» (ملاحظة هلا هـ-2): العنوان والوصف بالعربية والإنجليزية، ومعرّف محادثة Pol.is (أو رابطها)،
 * وفترة اختيارية. تُنشأ نشطة (افتراض الخادم)، ويُضاف تقريرها لاحقًا من الصفحة نفسها.
 */
export default function CreateConsultationDialog({ onClose, onCreated }) {
  const { t } = useLanguage();
  const polisRef = useRef(null);
  const [form, setForm] = useState(emptyConsultationForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const invalid = validateConsultationForm(form);
    if (invalid) {
      setError(t(invalid.key));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const created = await createConsultation(consultationPayload(form));
      await onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminConsultations.create.title')} onClose={busy ? undefined : onClose} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <BilingualField label={t('adminConsultations.create.titleLabel')} value={form.title} onChange={set('title')} />
        <BilingualField label={t('adminConsultations.create.description')} value={form.description} onChange={set('description')} type="textarea" required={false} />

        <div>
          <label htmlFor="consultation-polis" className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('adminConsultations.create.polis')}</label>
          <input
            ref={polisRef}
            id="consultation-polis"
            dir="ltr"
            value={form.polis}
            onChange={(e) => set('polis')(e.target.value)}
            maxLength={300}
            placeholder="https://pol.is/…"
            aria-describedby="consultation-polis-hint"
            className={`${inputCls} font-mono`}
          />
          <p id="consultation-polis-hint" className="mt-1 text-xs text-[var(--wp-text-muted)]">{t('adminConsultations.create.polisHint')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('adminConsultations.create.startsAt')}</span>
            <input type="date" value={form.startsAt} onChange={(e) => set('startsAt')(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('adminConsultations.create.endsAt')}</span>
            <input type="date" value={form.endsAt} min={form.startsAt || undefined} onChange={(e) => set('endsAt')(e.target.value)} className={inputCls} />
          </label>
        </div>

        {error && <Alert size="sm">{error}</Alert>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm text-[var(--wp-text-2)] hover:bg-[#F6F6F6] disabled:opacity-50">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={busy} className="wp-btn-ink rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            {busy ? t('common.saving') : t('adminConsultations.create.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
