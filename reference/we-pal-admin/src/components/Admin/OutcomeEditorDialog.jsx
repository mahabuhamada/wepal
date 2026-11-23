import { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { getOutcomeForEdit, publishOutcome, saveOutcome } from '../../api/admin';
import { OUTCOME_FIELDS, outcomeComplete, outcomeFieldErrors, outcomeFields, outcomePayload } from '../../utils/outcome';
import OutcomeCard from '../Outcome/OutcomeCard';

const inputCls = 'wp-input w-full px-3 py-2 text-sm';
const EMPTY = { asked: { ar: '', en: '' }, said: { ar: '', en: '' }, did: { ar: '', en: '' } };
const MAX = 3000;

/**
 * كتابة خلاصة «سألنا / قلتم / فعلنا» ونشرها (الحزمة 6أ).
 * item: { subjectType, subjectId, title, participantsCount, hasDraft }.
 * «حفظ مسودة» = PUT، و«نشر وإشعار المشاركين» يمرّ بخطوة تأكيد داخل النافذة نفسها ثم POST .../publish.
 */
export default function OutcomeEditorDialog({ item, onClose, onSaved, onPublished }) {
  const { t, lang } = useLanguage();
  const firstRef = useRef(null);
  const [fields, setFields] = useState(EMPTY);
  const [loading, setLoading] = useState(Boolean(item.hasDraft));
  const [step, setStep] = useState('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  // ما حُمِّل أو حُفظ آخر مرة: الإغلاق مع تعديلات غير محفوظة يسأل أولًا (القسم 4.4، حارس المغادرة)
  const [savedFields, setSavedFields] = useState(EMPTY);
  const [preview, setPreview] = useState(false);
  const dirty = JSON.stringify(fields) !== JSON.stringify(savedFields);
  const close = () => {
    if (dirty && !window.confirm(lang === 'en' ? 'You have unsaved changes. Leave without saving?' : 'لديك تعديلات غير محفوظة. مغادرة دون حفظ؟')) return;
    onClose();
  };

  // مسودة محفوظة: نحمّلها بالترجمات الخام حتى لا يمحو الحفظ الإنجليزية.
  useEffect(() => {
    if (!item.hasDraft) return undefined;
    let active = true;
    getOutcomeForEdit(item.subjectType, item.subjectId)
      .then((data) => { if (active) { setFields(outcomeFields(data)); setSavedFields(outcomeFields(data)); } })
      .catch((err) => { if (active && err?.status !== 404) setError(err?.message || t('common.loadError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item.hasDraft, item.subjectType, item.subjectId, t]);

  const setField = (key, lang) => (e) => setFields((f) => ({ ...f, [key]: { ...f[key], [lang]: e.target.value } }));

  const run = async (action) => {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      await action();
      onClose();
    } catch (err) {
      setFieldErrors(outcomeFieldErrors(err?.errors));
      setError(err?.message || t('common.loadError'));
      setStep('edit');
      setBusy(false);
    }
  };

  const saveDraft = () => run(async () => {
    await saveOutcome(item.subjectType, item.subjectId, outcomePayload(fields));
    await onSaved?.(item);
  });

  const askPublish = () => {
    if (!outcomeComplete(fields)) {
      setError(t('outcome6a.admin.required'));
      return;
    }
    setError('');
    setStep('confirm');
  };

  const publish = () => run(async () => {
    await publishOutcome(item.subjectType, item.subjectId, outcomePayload(fields));
    await onPublished?.(item);
  });

  return (
    <Modal title={t('outcome6a.admin.editorTitle', { title: item.title })} onClose={busy ? undefined : close} initialFocusRef={firstRef} size="lg">
      {loading && <p role="status" aria-busy="true" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}

      {!loading && step === 'edit' && (
        <form onSubmit={(e) => { e.preventDefault(); askPublish(); }} className="space-y-5" noValidate>
          {OUTCOME_FIELDS.map((key, i) => (
            <fieldset key={key} className="space-y-2" aria-describedby={`oc-hint-${key}`}>
              <legend className="text-sm font-bold text-[var(--wp-ink)]">{t(`outcome6a.${key}`)}</legend>
              <p id={`oc-hint-${key}`} className="text-xs text-[var(--wp-text-3)]">{t(`outcome6a.admin.hints.${key}`)}</p>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('outcome6a.admin.ar')}</span>
                <textarea
                  ref={i === 0 ? firstRef : undefined}
                  dir="rtl"
                  rows={key === 'asked' ? 2 : 4}
                  maxLength={MAX}
                  value={fields[key].ar}
                  onChange={setField(key, 'ar')}
                  aria-invalid={fieldErrors[key] ? 'true' : undefined}
                  aria-errormessage={fieldErrors[key] ? `oc-err-${key}` : undefined}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('outcome6a.admin.en')}</span>
                <textarea dir="ltr" rows={key === 'asked' ? 2 : 3} maxLength={MAX} value={fields[key].en} onChange={setField(key, 'en')} className={inputCls} />
              </label>
              {fieldErrors[key] && <p id={`oc-err-${key}`} role="alert" className="text-xs text-[var(--color-danger-text)]">{fieldErrors[key]}</p>}
            </fieldset>
          ))}

          {error && <Alert size="sm">{error}</Alert>}

          {preview && (
            <div className="oc-preview" aria-label={lang === 'en' ? 'Preview' : 'معاينة'}>
              <p className="text-xs text-[var(--wp-text-3)]">{lang === 'en' ? 'As members will see it after publishing:' : 'كما يراها المشاركون بعد النشر:'}</p>
              <OutcomeCard outcome={{ asked: fields.asked[lang] || fields.asked.ar, said: fields.said[lang] || fields.said.ar, did: fields.did[lang] || fields.did.ar }}
                title={item.title} subjectType={item.subjectType} subjectId={item.subjectId} participantsCount={item.participantsCount} closedAt={item.closedAt} headingLevel={3} />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={close} disabled={busy}>{t('outcome6a.admin.close')}</Button>
            <Button variant="ghost" size="sm" aria-pressed={preview} onClick={() => setPreview((v) => !v)}>{lang === 'en' ? (preview ? 'Hide preview' : 'Preview') : (preview ? 'إخفاء المعاينة' : 'معاينة')}</Button>
            <Button variant="secondary" size="sm" onClick={saveDraft} loading={busy}>{t('outcome6a.admin.saveDraft')}</Button>
            <Button type="submit" variant="primary" size="sm" disabled={busy}>{t('outcome6a.admin.publish')}</Button>
          </div>
        </form>
      )}

      {!loading && step === 'confirm' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('outcome6a.admin.confirmTitle')}</h3>
          <p className="text-sm leading-relaxed text-[var(--wp-text-2)]">
            {t('outcome6a.admin.confirmText', { title: item.title, count: item.participantsCount ?? 0 })}
          </p>
          {error && <Alert size="sm">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep('edit')} disabled={busy}>{t('outcome6a.admin.back')}</Button>
            <Button variant="primary" size="sm" onClick={publish} loading={busy}>{t('outcome6a.admin.confirm')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
