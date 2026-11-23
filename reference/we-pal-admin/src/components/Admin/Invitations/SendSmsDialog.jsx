import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Input } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { sendInvitationSms } from '../../../api/invitations';
import { INVITE_LIMITS, sendSmsErrors } from '../../../utils/individualInvitations';

/**
 * إرسال كود من دفعة لشخص: يطلب الاسم والجوال (ما لم يكونا محفوظين على الكود) ثم يرسل.
 * onSent({data, sms}) بعد رد الخادم، نجح الإرسال أو فشل (الكود يبقى صالحًا في الحالتين).
 */
export default function SendSmsDialog({ code, onClose, onSent }) {
  const { t } = useLanguage();
  const invitee = code.invitee ?? null;
  const [form, setForm] = useState({ name: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = 'inviteSms';

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (field) => (errors[field] ? (errors[field].startsWith('inviteSms.') ? t(errors[field]) : errors[field]) : undefined);

  const submit = async (e) => {
    e.preventDefault();
    const invalid = sendSmsErrors(form, invitee);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError('');
    try {
      const res = await sendInvitationSms(code.id, form);
      onSent(res);
      onClose();
    } catch (ex) {
      if (ex?.field && ex.field in form) setErrors({ [ex.field]: ex.message });
      else setError(ex?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(`${k}.sendDialog.title`, { code: code.code })} onClose={busy ? undefined : onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-[var(--wp-text-2)]">{t(`${k}.sendDialog.body`)}</p>
        {!invitee?.name && (
          <Field label={t(`${k}.form.name`)} hint={t(`${k}.form.nameHint`)} error={err('name')}>
            <Input autoFocus autoComplete="off" maxLength={INVITE_LIMITS.nameMax} value={form.name} onChange={set('name')} invalid={!!errors.name} />
          </Field>
        )}
        {!invitee?.phone ? (
          <Field label={t(`${k}.form.phone`)} hint={t(`${k}.form.phoneHint`)} error={err('phone')}>
            <Input type="tel" dir="ltr" inputMode="tel" autoComplete="off" placeholder="059 000 0000" value={form.phone} onChange={set('phone')} invalid={!!errors.phone} />
          </Field>
        ) : (
          <p className="text-sm text-[var(--wp-text)]">
            {invitee.name} · <span dir="ltr">{invitee.phone}</span>
          </p>
        )}
        <p className="flex items-start gap-2 text-sm text-[var(--wp-text-3)]">
          <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {t(`${k}.form.privacy`)}
        </p>
        {error && <Alert size="sm">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t(`${k}.sendDialog.cancel`)}</Button>
          <Button type="submit" loading={busy}>{busy ? t(`${k}.sendDialog.sending`) : t(`${k}.sendDialog.submit`)}</Button>
        </div>
      </form>
    </Modal>
  );
}
