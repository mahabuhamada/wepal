import { useRef, useState } from 'react';
import { CheckCircle2, Copy, MessageSquareText, ShieldCheck } from 'lucide-react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Input, Select } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { createIndividualInvitation } from '../../../api/invitations';
import { REGIONS, regionLabel } from '../../../utils/apiMappers';
import { TRACKS } from '../../../utils/proposals';
import { INVITE_LIMITS, emptyInviteForm, inviteFormErrors, invitePayload } from '../../../utils/individualInvitations';
import { copyText } from './copyText';

/**
 * «دعوة شخص»: الاسم والجوال (والبريد اختياريًا)، والمنطقة والدفعة والمسار والصلاحية، و«أرسل الكود برسالة SMS».
 * بعد الإنشاء يعرض الكود (قابلًا للنسخ) ونتيجة الرسالة. onCreated(invitation) لكل دعوة جديدة.
 */
export default function InviteFormDialog({ cohorts = [], onClose, onCreated }) {
  const { t } = useLanguage();
  const [result, setResult] = useState(null);
  const k = 'inviteSms';

  return (
    <Modal title={t(result ? `${k}.result.title` : `${k}.form.title`)} onClose={onClose} size="lg">
      {result
        ? <Result result={result} onAnother={() => setResult(null)} onClose={onClose} />
        : <InviteForm cohorts={cohorts} onCancel={onClose} onCreated={(res) => { onCreated?.(res.data); setResult(res); }} t={t} />}
    </Modal>
  );
}

function InviteForm({ cohorts, onCancel, onCreated, t }) {
  const { lang } = useLanguage();
  const nameRef = useRef(null);
  const [form, setForm] = useState(() => emptyInviteForm(cohorts));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = 'inviteSms.form';

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const err = (field) => (errors[field] ? (errors[field].startsWith('inviteSms.') ? t(errors[field]) : errors[field]) : undefined);

  const submit = async (e) => {
    e.preventDefault();
    const invalid = inviteFormErrors(form);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError('');
    try {
      onCreated(await createIndividualInvitation(invitePayload(form)));
    } catch (ex) {
      // 422 على حقل بعينه (مثل رقم لا يقبله الخادم): الرسالة بجانب الحقل
      if (ex?.field && ex.field in form) setErrors({ [ex.field]: ex.message });
      else setError(ex?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t(`${k}.name`)} hint={t(`${k}.nameHint`)} error={err('name')}>
          <Input ref={nameRef} autoFocus autoComplete="off" maxLength={INVITE_LIMITS.nameMax} value={form.name} onChange={set('name')} invalid={!!errors.name} />
        </Field>
        <Field label={t(`${k}.phone`)} hint={t(`${k}.phoneHint`)} error={err('phone')}>
          <Input type="tel" dir="ltr" inputMode="tel" autoComplete="off" placeholder="059 000 0000" value={form.phone} onChange={set('phone')} invalid={!!errors.phone} />
        </Field>
      </div>
      <Field label={t(`${k}.email`)} optional={t(`${k}.optional`)} hint={t(`${k}.emailHint`)} error={err('email')}>
        <Input type="email" dir="ltr" autoComplete="off" maxLength={INVITE_LIMITS.emailMax} value={form.email} onChange={set('email')} invalid={!!errors.email} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t(`${k}.region`)} error={err('region')}>
          <Select value={form.region} onChange={set('region')}>
            {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
          </Select>
        </Field>
        <Field label={t(`${k}.cohort`)} error={err('cohort')}>
          <Select value={form.cohort} onChange={set('cohort')} invalid={!!errors.cohort}>
            {cohorts.length !== 1 && <option value="">—</option>}
            {cohorts.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t(`${k}.track`)}>
          <Select value={form.track} onChange={set('track')}>
            <option value="">{t(`${k}.trackAny`)}</option>
            {TRACKS.map((tr) => <option key={tr.value} value={tr.value}>{t(tr.labelKey)}</option>)}
          </Select>
        </Field>
        <Field label={t(`${k}.days`)} error={err('expiresInDays')}>
          <Input type="number" inputMode="numeric" min={INVITE_LIMITS.daysMin} max={INVITE_LIMITS.daysMax} value={form.expiresInDays} onChange={set('expiresInDays')} invalid={!!errors.expiresInDays} />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--wp-border)] bg-[var(--wp-bg)] p-3">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-[var(--wp-accent)]"
          checked={form.sendSms}
          onChange={(e) => setForm((f) => ({ ...f, sendSms: e.target.checked }))}
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--wp-text)]">
            <MessageSquareText size={16} aria-hidden="true" /> {t(`${k}.sendSms`)}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--wp-text-muted)]">{t(`${k}.sendSmsHint`)}</span>
        </span>
      </label>

      <p className="flex items-start gap-2 text-sm text-[var(--wp-text-3)]">
        <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {t(`${k}.privacy`)}
      </p>
      {error && <Alert size="sm">{error}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{t(`${k}.cancel`)}</Button>
        <Button type="submit" loading={busy}>{busy ? t(`${k}.saving`) : t(form.sendSms ? `${k}.submitSend` : `${k}.submit`)}</Button>
      </div>
    </form>
  );
}

function Result({ result, onAnother, onClose }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState('');
  const { data: inv, sms } = result;
  const k = 'inviteSms.result';

  const copy = async (what, text) => {
    setCopied((await copyText(text)) ? what : '');
  };

  let tone = 'info';
  let message = t(`${k}.notSent`);
  if (sms?.sent) {
    tone = 'success';
    // عزل اتجاه الرقم (LRI…PDI): داخل جملة عربية يظهر ‎+970••••••832 مقلوبًا بدونه
    message = t(`${k}.sent`, { phone: `\u2066${inv.invitee?.phone ?? ''}\u2069` });
  } else if (sms?.reason) {
    tone = 'warning';
    message = t(`${k}.failed`, { reason: sms.message ?? '' });
  }

  return (
    <div className="space-y-4">
      <Alert tone={tone} role="status">
        <span className="block">{message}</span>
        {sms?.reason && <span className="mt-1 block text-xs">{t(`${k}.failedHint`)}</span>}
      </Alert>
      <div className="rounded-xl border border-[var(--wp-border)] bg-[var(--wp-bg)] p-4 text-center">
        <p className="text-xs text-[var(--wp-text-muted)]">{t(`${k}.code`)}{inv.invitee?.name ? ` · ${inv.invitee.name}` : ''}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-[var(--wp-text)]" dir="ltr" data-testid="invite-code">{inv.code}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => copy('code', inv.code)}>
            {copied === 'code' ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />} {t(`${k}.copyCode`)}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => copy('link', inv.joinUrl)}>
            {copied === 'link' ? <CheckCircle2 aria-hidden="true" /> : <Copy aria-hidden="true" />} {t(`${k}.copyLink`)}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onAnother}>{t(`${k}.another`)}</Button>
        <Button onClick={onClose}>{t(`${k}.done`)}</Button>
      </div>
    </div>
  );
}
