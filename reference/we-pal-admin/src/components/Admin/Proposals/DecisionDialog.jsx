import { useRef, useState } from 'react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Textarea } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { decideProposal } from '../../../api/proposals';

const TITLES = {
  approve: 'workspaceProposals.admin.dialog.approveTitle',
  request_changes: 'workspaceProposals.admin.dialog.changesTitle',
  decline: 'workspaceProposals.admin.dialog.declineTitle',
};
const LABELS = {
  approve: 'workspaceProposals.admin.dialog.approveLabel',
  request_changes: 'workspaceProposals.admin.dialog.changesLabel',
  decline: 'workspaceProposals.admin.dialog.declineLabel',
};

/**
 * قرار المدير في مقترح: موافقة (ملاحظة اختيارية)، أو طلب تعديل، أو اعتذار (الملاحظة إلزامية لهما).
 * onDone(proposal) بعد نجاح القرار.
 */
export default function DecisionDialog({ proposal, decision, onClose, onDone }) {
  const { t } = useLanguage();
  const noteRef = useRef(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [noteError, setNoteError] = useState('');
  const required = decision !== 'approve';

  const submit = async (e) => {
    e.preventDefault();
    if (required && !note.trim()) {
      setNoteError(t('workspaceProposals.admin.dialog.noteRequired'));
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      const next = await decideProposal(proposal.id, decision, note);
      onDone(next);
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(TITLES[decision], { title: proposal.title })} onClose={busy ? undefined : onClose} initialFocusRef={noteRef}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {decision === 'approve' && (
          <p className="text-sm text-[var(--wp-text-2)]">{t('workspaceProposals.admin.dialog.approveMessage', { name: proposal.proposer?.name ?? '' })}</p>
        )}
        <Field label={t(LABELS[decision])} error={noteError}>
          <Textarea ref={noteRef} rows={4} maxLength={1000} required={required} value={note} onChange={(e) => { setNote(e.target.value); setNoteError(''); }} />
        </Field>
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button type="submit" variant={decision === 'decline' ? 'danger' : 'primary'} loading={busy}>
            {busy ? t('workspaceProposals.admin.dialog.sending') : t('workspaceProposals.admin.dialog.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
