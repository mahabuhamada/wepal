import { useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Select } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { launchChallenge } from '../../../api/proposals';

/** فتح مساحة التحدي بقرار المدير، ولو قبل اكتمال الحد الأدنى، مع اختيار القائد من المنضمين. */
export default function LaunchDialog({ challenge, onClose, onDone }) {
  const { t } = useLanguage();
  const selectRef = useRef(null);
  const participants = challenge.participants ?? [];
  const [leaderId, setLeaderId] = useState(participants[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const k = 'workspaceProposals.admin.challenges.launchDialog';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onDone(await launchChallenge(challenge.id, leaderId));
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(`${k}.title`, { title: challenge.title })} onClose={busy ? undefined : onClose} initialFocusRef={selectRef}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-[var(--wp-text-2)]">{t(`${k}.message`, { count: participants.length })}</p>
        <Field label={t(`${k}.leader`)}>
          <Select ref={selectRef} value={leaderId} onChange={(e) => setLeaderId(e.target.value)}>
            {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy} disabled={!leaderId}>{t(`${k}.confirm`)}</Button>
        </div>
      </form>
    </Modal>
  );
}
