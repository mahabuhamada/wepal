import { useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Input, Select, Textarea } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { createChallenge, updateChallenge } from '../../../api/proposals';
import {
  TEAM_MAX, TEAM_MIN, TRACKS, challengeFormErrors, challengePayload, challengeToForm, emptyChallengeForm, localToday,
} from '../../../utils/proposals';

const SIZES = Array.from({ length: TEAM_MAX - TEAM_MIN + 1 }, (_, i) => String(TEAM_MIN + i));

/** طرح تحدٍّ أو تعديله (ما دام مفتوحًا). onSaved(challenge, created) بعد النجاح. */
export default function ChallengeFormDialog({ challenge, onClose, onSaved }) {
  const { t } = useLanguage();
  const titleRef = useRef(null);
  const [form, setForm] = useState(() => (challenge ? challengeToForm(challenge) : emptyChallengeForm()));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = localToday();
  const k = 'workspaceProposals.admin.challenges.form';

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const invalid = challengeFormErrors(form, today);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    setError('');
    try {
      const saved = challenge
        ? await updateChallenge(challenge.id, challengePayload(form, challenge))
        : await createChallenge(challengePayload(form));
      onSaved(saved, !challenge);
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  const err = (field) => (errors[field] ? t(errors[field]) : undefined);

  return (
    <Modal title={t(challenge ? `${k}.editTitle` : `${k}.createTitle`)} onClose={busy ? undefined : onClose} initialFocusRef={titleRef} size="lg">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t(`${k}.title`)} error={err('title')}>
          <Input ref={titleRef} maxLength={160} value={form.title} onChange={set('title')} />
        </Field>
        <Field label={t('workspaceProposals.form.track')}>
          <Select value={form.track} onChange={set('track')}>
            {TRACKS.map((tr) => <option key={tr.value} value={tr.value}>{t(tr.labelKey)}</option>)}
          </Select>
        </Field>
        <Field label={t(`${k}.description`)} hint={t(`${k}.descriptionHint`)} error={err('description')}>
          <Textarea rows={4} maxLength={2000} value={form.description} onChange={set('description')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t(`${k}.minMembers`)} error={err('size')}>
            <Select value={form.minMembers} onChange={set('minMembers')}>
              {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label={t(`${k}.maxMembers`)}>
            <Select value={form.maxMembers} onChange={set('maxMembers')}>
              {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label={t(`${k}.closesAt`)} error={err('closesAt')}>
            <Input type="date" min={today} value={form.closesAt} onChange={set('closesAt')} />
          </Field>
        </div>
        <p className="text-xs text-[var(--wp-text-muted)]">{t(`${k}.sizeHint`)}</p>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy}>{busy ? t(`${k}.saving`) : t(challenge ? `${k}.save` : `${k}.publish`)}</Button>
        </div>
      </form>
    </Modal>
  );
}
